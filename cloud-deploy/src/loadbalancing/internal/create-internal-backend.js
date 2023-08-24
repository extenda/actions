const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const createInternalLoadbalancer = require('./create-internal-loadbalancer');

// Create backend-service
const setupBackendService = async (name, projectID, region, serviceType) => gcloudOutput([
  'compute',
  'backend-services',
  'create',
  `${name}-internal-backend`,
  `--protocol=${serviceType === 'grpc' ? 'HTTP2' : 'HTTP'}`,
  '--port-name=http',
  '--connection-draining-timeout=300s',
  `--health-checks=${projectID}-internal-hc`,
  '--timeout=300s',
  `--region=${region}`,
  '--health-checks-region=europe-west1',
  '--load-balancing-scheme=INTERNAL_MANAGED',
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

// Check if NEGs exists
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
  `${name}-internal-backend`,
  `--network-endpoint-group=${name}-neg`,
  `--network-endpoint-group-zone=${zone}`,
  `--project=${projectID}`,
  '--region=europe-west1',
  '--balancing-mode=rate',
  '--max-rate-per-endpoint=1',
]).catch(() => core.info('Backend already added to service!'));

const setupBackendURLMapping = async (host, projectID, name, env, region) => gcloudOutput([
  'compute',
  'url-maps',
  'add-path-matcher',
  `${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
  `--project=${projectID}`,
  `--default-service=${name}-internal-backend`,
  `--path-matcher-name=${name}-internal-backend`,
  `--region=${region}`,
  `--new-hosts=${host}`,
]).catch(() => core.info('Url-mapping already exists!'));

const configureBackend = async (projectID, name, region, serviceType) => {
  core.info('Creating internal backend service');
  await setupBackendService(name, projectID, region, serviceType);

  core.info('Adding backend NEG to internal backend service');
  await checkNEGs(projectID, name)
    .then(() => addBackend(name, projectID, 'europe-west1-d'))
    .then(() => addBackend(name, projectID, 'europe-west1-c'))
    .then(() => addBackend(name, projectID, 'europe-west1-b'))
    .catch(() => { throw new Error('The NEG was not found! make sure the deployment is correct'); });
};

// Create healthcheck if not exists
const setupHealthCheck = async (projectID, region) => gcloudOutput([
  'compute',
  'health-checks',
  'create',
  'tcp',
  `${projectID}-internal-hc`,
  `--region=${region}`,
  '--use-serving-port',
  '--check-interval=10s',
  `--project=${projectID}`,
]).catch(() => core.info('Health check already exists!'));

const configureInternalDomain = async (projectID, name, env, serviceType) => {
  const host = `${name}.internal.retailsvc.com`;
  const region = 'europe-west1';
  await setupHealthCheck(projectID, region);
  await configureBackend(projectID, name, region, serviceType);
  await createInternalLoadbalancer(projectID, env, name);
  core.info('Setup url-mapping');
  return setupBackendURLMapping(host, projectID, name, env, region);
};

module.exports = configureInternalDomain;
