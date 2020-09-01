const core = require('@actions/core');
const exec = require('@actions/exec');

const FIVE_MINUTES = 300000;

const findRevision = (output) => {
  const matches = output.match(/ERROR: \(gcloud\.run\.deploy\) Revision "([^"]+)" failed with message: 0\/\d+ nodes/);
  if (matches && matches.length >= 2) {
    return matches[1];
  }
  throw new Error('Deploy failed for other reasons than node scaling out');
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
    findArg('--cluster='),
    findArg('--cluster-location='),
    findArg('--namespace='),
    '--format=json',
  ], {
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
    keys.map((key) => ({ key, reason: revisionStatus[key].reason }))
      .forEach(({ key, reason }) => {
        if (typeof reason === 'string' && reason.startsWith('ExitCode')) {
          throw new Error(`Revision failed "${key}" condition with reason: ${reason}`);
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

const waitForRevision = async (
  { status, output },
  args,
  sleepMs = 10000,
  timeoutMs = FIVE_MINUTES,
) => {
  if (status === 0) {
    return status;
  }

  if (!args.includes('--platform=gke')) {
    throw new Error('Wait is not supported for managed cloud run');
  }

  const revision = findRevision(output);

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

  return 0;
};

module.exports = waitForRevision;
