const core = require('@actions/core');
const exec = require('@actions/exec');
const gcloudOutput = require('./gcloud-output');
const getLatestRevision = require('./get-revision');
const projectInfo = require('./project-info');

const FIVE_MINUTES = 300000;

const findRevision = async (output, namespace, cluster) => {
  const failureMatches = [
    /ERROR: \(gcloud\.run\.deploy\) Revision "([^"]+)" failed with message: 0\/\d+ nodes/,
    /ERROR: \(gcloud\.run\.deploy\) Revision "([^"]+)" failed with message: Unable to fetch image "([^"]+)": failed to resolve image to digest: Get "([^"]+)": context deadline exceeded./,
    /ERROR: \(gcloud\.run\.deploy\) Ingress reconciliation failed/,
    /ERROR: gcloud crashed \(OSError\): Could not find a suitable TLS CA certificate bundle, invalid path: ([^"]+)/,
    new RegExp(`ERROR: \\(gcloud\\.run\\.deploy\\) Configuration "${namespace}" does not have any ready Revision.`),
  ];
  let match;
  failureMatches.forEach((failureMatch) => {
    const matches = output.match(failureMatch);
    if (matches) {
      if (matches.length >= 2) {
        [, match] = matches;
      } else {
        match = getLatestRevision(namespace, cluster);
      }
    }
  });

  if (match) {
    return match;
  }

  throw new Error('Deploy failed for unknown reasons');
};

const parseConditions = (conditions) => {
  // Default status flags.
  const revisionStatus = {
    active: { status: false },
    ready: { status: false },
    containerHealthy: { status: false },
    resourcesAvailable: { status: false },
  };

  conditions.forEach((condition) => {
    const type = condition.type.charAt(0).toLowerCase() + condition.type.slice(1);
    const status = condition.status === 'True';
    revisionStatus[type] = {
      status,
      lastTransitionTime: condition.lastTransitionTime,
      reason: condition.reason || null,
      message: condition.message || null,
    };
  });

  return revisionStatus;
};

const getRevisionStatus = async (revision, args) => {
  const findArg = (match) => args.find((a) => a.startsWith(match));
  let stdout = '';
  await exec.exec('gcloud', [
    'run', 'revisions', 'describe', revision,
    findArg('--project='),
    findArg('--platform='),
    findArg('--cluster='),
    findArg('--cluster-location='),
    findArg('--namespace='),
    '--format=json',
  ], {
    silent: true,
    listeners: {
      stdout: (data) => {
        stdout += data.toString('utf8');
      },
    },
  });

  try {
    const { status: { conditions } } = JSON.parse(stdout.trim());
    core.debug(JSON.stringify(conditions, null, 2));
    return parseConditions(conditions);
  } catch (err) {
    throw new Error(`Invalid JSON: Failed to load status for revision "${revision}". Reason: ${err.message}`);
  }
};

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

const isRevisionCompleted = (revisionStatus) => {
  const keys = ['active', 'ready', 'containerHealthy', 'resourcesAvailable'];
  const success = keys.map((key) => revisionStatus[key].status)
    .reduce((prev, status) => prev && status, true);

  if (!success) {
    // Check if we should fail fast
    keys.map((key) => {
      const { reason = null, message = '' } = revisionStatus[key];
      return { key, reason, message };
    }).forEach(({ key, reason, message }) => {
      if (typeof reason === 'string' && reason.startsWith('ExitCode')) {
        throw new Error(`Revision failed "${key}" condition with reason: ${reason}\n${message || ''}`);
      }
    });
  }
  return success;
};

const printStatus = (revisionStatus) => {
  const completed = isRevisionCompleted(revisionStatus);
  const values = Object.keys(revisionStatus)
    .map((k) => `${k}=${revisionStatus[k].status}`).join(', ');
  return `${completed} (${values})`;
};

const updateTraffic = async (revision, cluster, canary, namespace) => {
  const env = await projectInfo(cluster.project).env;
  let rev = revision;
  if (!revision) {
    rev = await getLatestRevision(namespace, cluster);
  }

  let target = `--to-revisions=${rev}=100`;
  if ((canary && canary.enabled) && env === 'prod') {
    target = `--to-revisions=${rev}=${canary.steps.split('.')[0]}`;
  }

  return gcloudOutput([
    'run',
    'services',
    'update-traffic',
    namespace,
    target,
    `--cluster=${cluster.cluster}`,
    `--cluster-location=${cluster.clusterLocation}`,
    `--namespace=${namespace}`,
    `--project=${cluster.project}`,
    '--platform=gke',
    '--no-user-output-enabled',
  ]);
};

const waitForRevision = async (
  { status, output },
  args,
  namespace,
  cluster,
  canary,
  sleepMs = 10000,
  timeoutMs = FIVE_MINUTES,
) => {
  if (status !== 0 || (canary && canary.enabled)) {
    if (!args.includes('--platform=gke')) {
      throw new Error('Wait is not supported for managed cloud run');
    }

    let revision = '';
    if (canary && canary.enabled) {
      revision = await getLatestRevision(namespace, cluster);
    } else {
      revision = await findRevision(output, namespace, cluster);
    }
    // update traffic on latest revision based on steps
    await updateTraffic(revision, cluster, canary, namespace);

    core.info(`Waiting for revision "${revision}" to become active...`);
    let revisionStatus = {};

    /* eslint-disable no-await-in-loop */
    const t0 = Date.now();
    do {
      if (Date.now() - t0 > timeoutMs) {
        throw new Error(`Timed out after while for revision "${revision}".`);
      }
      await timer(sleepMs);
      revisionStatus = await getRevisionStatus(revision, args);
      core.info(`Deploy status is: ${printStatus(revisionStatus)}`);
    } while (!isRevisionCompleted(revisionStatus));
    /* eslint-enable no-await-in-loop */
  } else if (status === 0) {
    if (args.includes('--platform=gke')) {
      await updateTraffic(null, cluster, canary, namespace);
    }
  }
  return 0;
};

module.exports = waitForRevision;
