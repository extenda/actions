const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');

// Create backend-service
const setupBackendService = async (name, projectID, serviceType) => gcloudOutput([
  'compute',
  'backend-services',
  'create',
  `${name}-external-backend`,
  `--protocol=${serviceType === 'grpc' ? 'HTTP2' : 'HTTP'}`,
  '--port-name=http',
  '--connection-draining-timeout=300s',
  `--health-checks=${projectID}-external-hc`,
  '--timeout=300s',
  '--global',
  '--enable-logging',
  '--logging-sample-rate=1',
  '--load-balancing-scheme=EXTERNAL',
  `--project=${projectID}`,
]).catch(() => true);

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
const addBackend = async (name, projectID, zone) => gcloudOutput([
  'compute',
  'backend-services',
  'add-backend',
  `${name}-external-backend`,
  `--network-endpoint-group=${name}-neg`,
  `--network-endpoint-group-zone=${zone}`,
  `--project=${projectID}`,
  '--global',
  '--balancing-mode=rate',
  '--max-rate-per-endpoint=1',
]).catch(() => core.info('Backend already added to service!'));

const createPathMatcher = async (host, projectID, name, env) => gcloudOutput([
  'compute',
  'url-maps',
  'add-path-matcher',
  `${projectID.split(`-${env}`)[0]}-${env}-lb-external`,
  `--project=${projectID}`,
  `--default-service=${name}-external-backend`,
  `--path-matcher-name=${name}-external-backend`,
  '--global',
  `--new-hosts=${host}`,
]).catch(() => core.info('Url-mapping already exists!'));

const setupBackendURLMapping = async (newHosts, projectID, name, env) => {
  let pathMatcherExists = false;
  const urlMapsInfo = JSON.parse(await gcloudOutput([
    'compute',
    'url-maps',
    'describe',
    `${projectID.split(`-${env}`)[0]}-${env}-lb-external`,
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
    // if new hosts need to be added to the pathmatcher
    if (newHosts.length > 0) {
      return gcloudOutput([
        'compute',
        'url-maps',
        'add-host-rule',
        `${projectID.split(`-${env}`)[0]}-${env}-lb-external`,
        `--hosts=${newHosts.join(',')}`,
        `--path-matcher-name=${name}-external-backend`,
        `--project=${projectID}`,
      ]);
    }
  }

  // if path matcher doesn't exists create it with the new hosts
  return createPathMatcher(newHosts, projectID, name, env);
};

const configureExternalDomain = async (projectID, name, env, host, serviceType) => {
  core.info('Creating backend service');
  await setupBackendService(name, projectID, serviceType);

  core.info('Adding backend NEG to backend service');
  await checkNEGs(projectID, name)
    .then(() => addBackend(name, projectID, 'europe-west1-d'))
    .then(() => addBackend(name, projectID, 'europe-west1-c'))
    .then(() => addBackend(name, projectID, 'europe-west1-b'))
    .catch(() => { throw new Error('The NEG was not found! make sure the deployment is correct'); });

  core.info('Setup url-mapping');
  if (host) {
    await setupBackendURLMapping(host, projectID, name, env);
  }
};

module.exports = configureExternalDomain;
