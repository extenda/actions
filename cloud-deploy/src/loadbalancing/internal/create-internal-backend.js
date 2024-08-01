const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const createInternalLoadbalancer = require('./create-internal-loadbalancer');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const getBackendStatus = async (name, projectID) => {
  try {
    const status = JSON.parse(
      await gcloudOutput([
        'compute',
        'backend-services',
        'describe',
        `${name}-internal-backend`,
        '--region=europe-west1',
        `--project=${projectID}`,
        '--format=json',
      ]),
    );
    const { backends } = status;
    const backendService = backends[0].group;
    if (backendService.includes('neg')) {
      return { backends, platform: 'gke' };
    }
    return { backends, platform: 'cloudrun' };
  } catch {
    return null;
  }
};

const createServerlessNeg = async (name, projectID, region) =>
  gcloudOutput([
    'compute',
    'network-endpoint-groups',
    'create',
    `${name}-cloudrun`,
    `--cloud-run-service=${name}`,
    '--network-endpoint-type=serverless',
    `--project=${projectID}`,
    `--region=${region}`,
  ]);

const deleteBackendService = async (name, projectID, env) => {
  await gcloudOutput([
    'compute',
    'url-maps',
    'remove-path-matcher',
    `${projectWithoutNumbers(projectID, env)}-lb-internal`,
    `--path-matcher-name=${name}-internal-backend`,
    '--region=europe-west1',
    `--project=${projectID}`,
  ]);
  const args = [
    'compute',
    'backend-services',
    'delete',
    `${name}-internal-backend`,
    '--region=europe-west1',
    '--quiet',
    `--project=${projectID}`,
  ];
  return gcloudOutput(args);
};

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
    `${name}-internal-backend`,
    platformGKE
      ? `--health-checks=${projectID}-external-hc`
      : '--no-health-checks',
    '--region=europe-west1',
    `--project=${projectID}`,
  ];

  if (platformGKE) {
    args.push(`--protocol=${serviceType === 'http2' ? 'HTTP2' : 'HTTP'}`);
    args.push(`--timeout=${connectionTimeout}s`);
  } else {
    args.push('--protocol=HTTPS');
  }
  return gcloudOutput(args);
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
    `${name}-internal-backend`,
    '--port-name=http',
    '--connection-draining-timeout=300s',
    '--region=europe-west1',
    '--health-checks-region=europe-west1',
    '--load-balancing-scheme=INTERNAL_MANAGED',
    `--project=${projectID}`,
  ];
  if (platformGKE) {
    args.push(`--protocol=${serviceType === 'http2' ? 'HTTP2' : 'HTTP'}`);
    args.push(`--health-checks=${projectID}-internal-hc`);
    args.push(`--timeout=${connectionTimeout}s`);
  }
  if (!platformGKE) {
    args.push('--protocol=HTTPS');
  }
  return gcloudOutput(args, 'gcloud', true, true).catch(() =>
    updateBackendService(
      name,
      projectID,
      serviceType,
      connectionTimeout,
      platformGKE,
    ),
  );
};

// Check if NEG exists
const checkNEG = async (projectID, zone, name) =>
  gcloudOutput([
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
const addBackend = async (name, projectID, zone, platformGKE) => {
  const args = [
    'compute',
    'backend-services',
    'add-backend',
    `${name}-internal-backend`,
    `--network-endpoint-group=${name}-${platformGKE ? 'neg' : 'cloudrun'}`,
    `--network-endpoint-group-${platformGKE ? 'zone' : 'region'}=${zone}`,
    `--project=${projectID}`,
    '--region=europe-west1',
  ];
  if (platformGKE) {
    args.push('--balancing-mode=RATE');
    args.push('--max-rate-per-endpoint=1');
  }
  return gcloudOutput(args);
};

const setupBackendURLMapping = async (host, projectID, name, env, region) =>
  gcloudOutput([
    'compute',
    'url-maps',
    'add-path-matcher',
    `${projectWithoutNumbers(projectID, env)}-lb-internal`,
    `--project=${projectID}`,
    `--default-service=${name}-internal-backend`,
    `--path-matcher-name=${name}-internal-backend`,
    `--region=${region}`,
    `--new-hosts=${host}`,
  ]);

const configureBackend = async (
  projectID,
  name,
  region,
  serviceType,
  connectionTimeout,
  platformGKE,
  env,
) => {
  // check backend platform status
  let doSwitch = false;

  // check backend exists and what platform state it is in
  const backendStatus = await getBackendStatus(name, projectID);

  // create if not existing
  if (!backendStatus) {
    core.info('Creating internal backend service');
    await setupBackendService(
      name,
      projectID,
      serviceType,
      connectionTimeout,
      platformGKE,
    );
  } else if (
    (backendStatus.platform === 'gke' && !platformGKE) ||
    (backendStatus.platform === 'cloudrun' && platformGKE)
  ) {
    doSwitch = true;
  }

  if (doSwitch) {
    await deleteBackendService(name, projectID, env);
    await setupBackendService(
      name,
      projectID,
      serviceType,
      connectionTimeout,
      platformGKE,
    );
  }

  if (platformGKE) {
    core.info('Adding backend NEG to internal backend service');
    await checkNEGs(projectID, name)
      .then(() => addBackend(name, projectID, 'europe-west1-d', platformGKE))
      .then(() => addBackend(name, projectID, 'europe-west1-c', platformGKE))
      .then(() => addBackend(name, projectID, 'europe-west1-b', platformGKE))
      .catch(() => {
        throw new Error(
          'The NEG was not found! make sure the deployment is correct',
        );
      });
  } else {
    await createServerlessNeg(name, projectID, region);
    await addBackend(name, projectID, region, platformGKE);
  }
};

// Create healthcheck if not exists
const setupHealthCheck = async (projectID, region) =>
  gcloudOutput([
    'compute',
    'health-checks',
    'create',
    'tcp',
    `${projectID}-internal-hc`,
    `--region=${region}`,
    '--use-serving-port',
    '--check-interval=10s',
    `--project=${projectID}`,
  ]);

const configureInternalDomain = async (
  projectID,
  name,
  env,
  serviceType,
  connectionTimeout,
  platformGKE,
) => {
  const host = `${name}.internal`;
  const region = 'europe-west1';
  await setupHealthCheck(projectID, region);
  await configureBackend(
    projectID,
    name,
    region,
    serviceType,
    connectionTimeout,
    platformGKE,
    env,
  );
  await createInternalLoadbalancer(projectID, env, name);
  core.info('Setup internal url-mapping');
  return setupBackendURLMapping(host, projectID, name, env, region);
};

module.exports = configureInternalDomain;
