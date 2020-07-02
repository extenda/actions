const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const getRuntimeAccount = require('./runtime-account');
const createEnvironmentArgs = require('./environment-args');
const getClusterInfo = require('./cluster-info');
const createNamespace = require('./create-namespace');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const numericOrDefault = (value) => (value >= 0 ? value : 'default');

const isManagedCloudRun = (cpu) => {
  if (typeof cpu === 'string' && cpu.endsWith('m')) {
    return false;
  }
  return true;
};

const setDefaultConcurrency = (cpu) => {
  const cloudDefaultConcurrency = 80;
  const cloudDefaultCPU = 1000;
  const maxConcurrency = 100;
  const minConcurrency = 10;
  let miliCPU = 0;
  if (isManagedCloudRun(cpu)) {
    miliCPU = cpu * 1000;
  } else {
    miliCPU = cpu.replace(/\D/g, '');
  }
  let defaultConcurrency = cloudDefaultConcurrency * (miliCPU / cloudDefaultCPU);
  if (defaultConcurrency > maxConcurrency) {
    defaultConcurrency = maxConcurrency;
  } else if (defaultConcurrency < minConcurrency) {
    defaultConcurrency = minConcurrency;
  }
  return Math.ceil(defaultConcurrency);
};

const managedArguments = async (args, service, projectId) => {
  const {
    cpu,
    platform: {
      managed: {
        'allow-unauthenticated': allowUnauthenticated,
        'cloudsql-instances': cloudSqlInstances = undefined,
        region,
        'runtime-account': runtimeAccountEmail = 'cloudrun-runtime',
      },
    },
  } = service;

  if (!isManagedCloudRun(cpu)) {
    throw new Error('Managed Cloud Run must be configured with CPU count [1,2]. Use of millicpu is not supported.');
  }

  const runtimeAccount = await getRuntimeAccount(runtimeAccountEmail, projectId);
  args.push(`--service-account=${runtimeAccount}`);

  args.push(
    `--cpu=${cpu}`,
    '--platform=managed',
    `--region=${region}`,
  );

  if (Array.isArray(cloudSqlInstances)) {
    if (cloudSqlInstances.length === 0) {
      args.push('--clear-cloudsql-instances');
    } else {
      args.push(`--set-cloudsql-instances=${cloudSqlInstances.join(',')}`);
    }
  }

  if (allowUnauthenticated) {
    args.push('--allow-unauthenticated');
  } else {
    args.push('--no-allow-unauthenticated');
  }
};

const gkeArguments = async (args, service, projectId) => {
  const {
    name,
    cpu,
    'min-instances': minInstances = -1,
    platform: {
      gke: {
        cluster: configuredCluster = undefined,
        connectivity,
        namespace = name,
        'opa-enabled': opaEnabled = true,
      },
    },
  } = service;

  if (isManagedCloudRun(cpu)) {
    throw new Error('Cloud Run GKE must be configured with millicpu. Use of CPU count is not supported.');
  }

  const cluster = await getClusterInfo(projectId, configuredCluster);

  args.push(
    `--cpu=${cpu}`,
    `--min-instances=${numericOrDefault(minInstances)}`,
    '--platform=gke',
    `--cluster=${cluster.uri}`,
    `--cluster-location=${cluster.clusterLocation}`,
    `--connectivity=${connectivity}`,
  );

  if (namespace !== 'default') {
    await createNamespace(projectId, opaEnabled, cluster, namespace);
  }
  args.push(`--namespace=${namespace}`);

  return cluster;
};

const runDeploy = async (serviceAccountKey, service, image, verbose = false) => {
  // Authenticate gcloud with our service-account
  const projectId = await gcloudAuth(serviceAccountKey);

  const {
    name,
    memory,
    concurrency = setDefaultConcurrency(service.cpu),
    'max-instances': maxInstances = -1,
    environment = [],
  } = service;

  const args = ['run', 'deploy', name,
    `--image=${image}`,
    `--project=${projectId}`,
    `--memory=${memory}`,
    `--concurrency=${concurrency}`,
    `--max-instances=${numericOrDefault(maxInstances)}`,
    `--set-env-vars=${createEnvironmentArgs(environment, projectId)}`,
  ];

  if (verbose) {
    args.push('--verbosity=debug');
  }


  let cluster;
  if (service.platform.managed) {
    await managedArguments(args, service, projectId);
  }

  if (service.platform.gke) {
    cluster = await gkeArguments(args, service, projectId);
  }

  const gcloudExitCode = await exec.exec('gcloud', args);

  return {
    gcloudExitCode,
    projectId,
    cluster,
  };
};

module.exports = runDeploy;
