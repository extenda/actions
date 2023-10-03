const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');
const fixPathMatchers = require('./fix-path-matchers');

const getBackendStatus = async (name, projectID) => {
  try {
    const status = JSON.parse(await gcloudOutput([
      'compute',
      'backend-services',
      'describe',
      `${name}-external-backend`,
      '--global',
      `--project=${projectID}`,
      '--format=json',
    ]));
    const { backends } = status;
    const backendService = backends[0].group;
    if (backendService.includes('neg')) {
      return {
        backends, platform: 'gke', protocol: status.protocol, timeout: status.timeoutSec,
      };
    }
    return { backends, platform: 'cloudrun' };
  } catch (err) {
    return null;
  }
};

const createServerlessNeg = async (
  name,
  projectID,
  region,
) => gcloudOutput([
  'compute',
  'network-endpoint-groups',
  'create',
  `${name}-cloudrun`,
  `--cloud-run-service=${name}`,
  '--network-endpoint-type=serverless',
  `--project=${projectID}`,
  `--region=${region}`,
]).catch(() => true);

// update backend service
const updateBackendService = async (
  name,
  projectID,
  serviceType,
  connectionTimeout,
  platformGKE,
) => {
  const args = [
    'compute',
    'backend-services',
    'update',
    `${name}-external-backend`,
    platformGKE ? `--health-checks=${projectID}-external-hc` : '--no-health-checks',
    '--global',
    `--project=${projectID}`,
  ];

  if (platformGKE) {
    args.push(`--protocol=${serviceType === 'http2' ? 'HTTP2' : 'HTTP'}`);
    args.push(`--timeout=${connectionTimeout}s`);
  } else {
    args.push('--protocol=HTTPS');
  }
  return gcloudOutput(args).catch(() => true);
};

// Create backend-service
const setupBackendService = async (
  name,
  projectID,
  serviceType,
  connectionTimeout,
  platformGKE,
) => {
  const args = [
    'compute',
    'backend-services',
    'create',
    `${name}-external-backend`,
    '--port-name=http',
    '--connection-draining-timeout=300s',
    '--global',
    '--enable-logging',
    '--logging-sample-rate=1',
    '--load-balancing-scheme=EXTERNAL',
    `--project=${projectID}`,
  ];
  if (platformGKE) {
    args.push(`--protocol=${serviceType === 'http2' ? 'HTTP2' : 'HTTP'}`);
    args.push(`--health-checks=${projectID}-external-hc`);
    args.push(`--timeout=${connectionTimeout}s`);
  }
  if (!platformGKE) {
    args.push('--protocol=HTTPS');
  }
  return gcloudOutput(args).catch(() => updateBackendService(
    name,
    projectID,
    serviceType,
    connectionTimeout,
    platformGKE,
  ));
};

const deleteBackendService = async (
  name,
  projectID,
  env,
) => {
  await gcloudOutput([
    'compute',
    'url-maps',
    'remove-path-matcher',
    `${projectWithoutNumbers(projectID, env)}-lb-external`,
    `--path-matcher-name=${name}-external-backend`,
    `--project=${projectID}`,
  ]).catch(() => true);
  const args = [
    'compute',
    'backend-services',
    'delete',
    `${name}-external-backend`,
    '--global',
    '--quiet',
    `--project=${projectID}`,
  ];
  return gcloudOutput(args).catch(() => true);
};

// Check if NEG exists
const checkNEG = async (projectID, zone, name) => gcloudOutput([
  'compute',
  'network-endpoint-groups',
  'describe',
  `${name}-neg`,
  `--project=${projectID}`,
  `--zone=${zone}`,
]);

// Check if NEG exists
const checkNEGs = async (projectID, name) => {
  const zones = ['europe-west1-d', 'europe-west1-c', 'europe-west1-b'];
  const promises = [];
  zones.forEach((zone) => {
    promises.push(checkNEG(projectID, zone, name));
  });
  return Promise.resolve(promises);
};

// Add NEG backend to backend-service
const addBackend = async (name, projectID, zone, platformGKE) => {
  const args = [
    'compute',
    'backend-services',
    'add-backend',
    `${name}-external-backend`,
    `--network-endpoint-group=${name}-${platformGKE ? 'neg' : 'cloudrun'}`,
    `--network-endpoint-group-${platformGKE ? 'zone' : 'region'}=${zone}`,
    `--project=${projectID}`,
    '--global',
  ];
  if (platformGKE) {
    args.push('--balancing-mode=RATE');
    args.push('--max-rate-per-endpoint=1');
  }
  return gcloudOutput(args).catch(() => core.info('Backend already added to service!'));
};

const createPathMatcher = async (host, projectID, name, env) => gcloudOutput([
  'compute',
  'url-maps',
  'add-path-matcher',
  `${projectWithoutNumbers(projectID, env)}-lb-external`,
  `--project=${projectID}`,
  `--default-service=${name}-external-backend`,
  `--path-matcher-name=${name}-external-backend`,
  '--global',
  `--new-hosts=${host}`,
]).catch(() => false);

const setupBackendURLMapping = async (newHosts, projectID, name, env) => {
  let pathMatcherExists = false;
  const urlMapsInfo = JSON.parse(await gcloudOutput([
    'compute',
    'url-maps',
    'describe',
    `${projectWithoutNumbers(projectID, env)}-lb-external`,
    `--project=${projectID}`,
    '--format=json',
  ]));

  // check if path matcher exists
  if (urlMapsInfo.pathMatchers) {
    for (const pathMatcher of urlMapsInfo.pathMatchers) {
      if (pathMatcher.name === `${name}-external-backend`) {
        pathMatcherExists = true;
        break;
      }
    }
  }

  // check if hosts exists in path rules if path matcher exists
  if (pathMatcherExists) {
    for (const hostRule of urlMapsInfo.hostRules) {
      // find the correct pathMatcher
      if (hostRule.pathMatcher === `${name}-external-backend`) {
        // compare hosts in path matchers with hosts in cloudrun yaml
        for (const host of hostRule.hosts) {
          for (const newHost of newHosts) {
            if (host === newHost) {
              const index = newHosts.indexOf(newHost);
              newHosts.splice(index, 1);
            }
          }
        }
      }
    }
  } else {
    // if path matcher doesn't exists create it with the new hosts
    return createPathMatcher(newHosts, projectID, name, env);
  }

  // if new hosts need to be added to the pathmatcher
  if (newHosts.length > 0 && pathMatcherExists) {
    return gcloudOutput([
      'compute',
      'url-maps',
      'add-host-rule',
      `${projectWithoutNumbers(projectID, env)}-lb-external`,
      `--hosts=${newHosts.join(',')}`,
      `--path-matcher-name=${name}-external-backend`,
      `--project=${projectID}`,
    ]);
  }
  return null;
};

const configureExternalDomain = async (
  projectID,
  name,
  env,
  host,
  serviceType,
  connectionTimeout,
  platformGKE,
) => {
  let doSwitch = false;

  // check path matchers linked to name-external-backend
  await fixPathMatchers(projectID, env, name, host);

  // check backend exists and what platform state it is in
  const backendStatus = await getBackendStatus(name, projectID);

  // if no create
  if (!backendStatus) {
    core.info('Creating backend service');
    await setupBackendService(name, projectID, serviceType, connectionTimeout, platformGKE);
  } else if (
    (backendStatus.platform === 'gke' && !platformGKE)
    || (backendStatus.platform === 'cloudrun' && platformGKE)) {
    doSwitch = true;
  }

  // remove all backends if switch is true and add new
  if (doSwitch) {
    await deleteBackendService(name, projectID, env);
    await setupBackendService(name, projectID, serviceType, connectionTimeout, platformGKE);
  }

  if (!platformGKE) {
    // create serverless neg
    await createServerlessNeg(name, projectID, 'europe-west1');
    await addBackend(name, projectID, 'europe-west1', platformGKE);
  }

  if (platformGKE) {
    if (backendStatus && !doSwitch) {
      await updateBackendService(name, projectID, serviceType, connectionTimeout, platformGKE);
    }
    core.info('Adding backend NEG to backend service');
    await checkNEGs(projectID, name)
      .then(() => addBackend(name, projectID, 'europe-west1-d', platformGKE))
      .then(() => addBackend(name, projectID, 'europe-west1-c', platformGKE))
      .then(() => addBackend(name, projectID, 'europe-west1-b', platformGKE))
      .catch(() => { throw new Error('The NEG was not found! make sure the deployment is correct'); });
  }

  if (host) {
    core.info('Setup url-mapping');
    await setupBackendURLMapping(host, projectID, name, env);
  }
};

module.exports = configureExternalDomain;
