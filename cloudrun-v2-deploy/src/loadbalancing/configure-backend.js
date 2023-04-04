
const core = require('@actions/core');
const gcloudOutput = require('../utils/gcloud-output');


// Create backend-service
const setupBackendService = async (name, projectID, hcName) => gcloudOutput([
  'compute',
  'backend-services',
  'create',
  `${name}-backend`,
  '--protocol=HTTP',
  '--port-name=http',
  '--connection-draining-timeout=300s',
  `--health-checks=${hcName}-hc`,
  '--timeout=120s',
  '--global',
  '--enable-logging',
  '--logging-sample-rate=1',
  '--load-balancing-scheme=EXTERNAL_MANAGED',
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
}

// Add NEG backend to backend-service
const addBackend = async (name, projectID, zone) => gcloudOutput([
  'compute',
  'backend-services',
  'add-backend',
  `${name}-backend`,
  `--network-endpoint-group=${name}-neg`,
  `--network-endpoint-group-zone=${zone}`,
  `--project=${projectID}`,
  '--global',
  '--balancing-mode=rate',
  '--max-rate-per-endpoint=1',
]).catch(() => core.info('Backend already added to service!'));

const setupBackendURLMapping = async (host, projectID, name, loadbalancerName) => gcloudOutput([
  'compute',
  'url-maps',
  'add-path-matcher',
  `${loadbalancerName}-lb`,
  `--project=${projectID}`,
  `--default-service=${name}-backend`,
  `--path-matcher-name=${name}-backend`,
  `--path-rules=/*=${name}-backend`,
  '--global',
  `--new-hosts=${host}`,
]).catch(() => core.info('Url-mapping already exists!'));

const configureDomain = async (projectID, name, private, host, env, clanName) => {

  const nameConv = `${clanName}-${private ? 'int' : 'ext'}-${env}`

  core.info('Creating backend service');
  const backendExists = await setupBackendService(name, projectID, nameConv);
  if(backendExists)
    return;

  core.info('Adding backend NEG to backend service');
  await checkNEGs(projectID, name)
    .then(() => addBackend(name, projectID, 'europe-west1-d'))
    .then(() => addBackend(name, projectID, 'europe-west1-c'))
    .then(() => addBackend(name, projectID, 'europe-west1-b'))
    .catch(() => { throw new Error('The NEG was not found! make sure the deployment is correct'); });

  core.info('Setup url-mapping');
  return setupBackendURLMapping(host, projectID, name, nameConv);
};

const configureDomains = async (projectID, name, host, env, clanName) => {
  await configureDomain(projectID, name, false, host, env, clanName);
  //await configureDomain(projectID, name, true, host, env, clanName);
};

module.exports = configureDomains;