const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const getRuntimeAccount = require('./runtime-account');
const createEnvironmentArgs = require('./environment-args');
const getClusterInfo = require('./cluster-info');
const createNamespace = require('./create-namespace');

const glcoudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const numericOrDefault = (value) => (value >= 0 ? value : 'default');

const managedArguments = async (args, service, projectId) => {
  const {
    platform: {
      managed: {
        'allow-unauthenticated': allowUnauthenticated,
        'cloudsql-instances': cloudSqlInstances = undefined,
        region,
        cpu = 1,
        'runtime-account': runtimeAccountEmail = 'cloudrun-runtime',
      },
    },
  } = service;

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
    'min-instances': minInstances = -1,
    platform: {
      gke: {
        cluster: configuredCluster = undefined,
        cpu = '1',
        connectivity,
        namespace = name,
        'opa-enabled': opaEnabled = true,
      },
    },
  } = service;

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

const runDeploy = async (serviceAccountKey, service, image) => {
  // Authenticate gcloud with our service-account
  const projectId = await glcoudAuth(serviceAccountKey);

  const {
    name,
    memory,
    concurrency = -1,
    'max-instances': maxInstances = -1,
    environment = [],
  } = service;

  const args = ['run', 'deploy', name,
    `--image=${image}`,
    `--project=${projectId}`,
    `--memory=${memory}`,
    `--concurrency=${numericOrDefault(concurrency)}`,
    `--max-instances=${numericOrDefault(maxInstances)}`,
    `--set-env-vars=${createEnvironmentArgs(environment, projectId)}`,
  ];


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
