const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const getRuntimeAccount = require('./runtime-account');
const createEnvironmentArgs = require('./environment-args');
const branchInfo = require('../../utils/src/branch-info');

const glcoudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const revisionSuffix = async () => {
  const sha = process.env.GITHUB_SHA;
  const tagAtSha = await branchInfo.getTagAtCommit(sha);
  const shortSha = await branchInfo.getShortSha(sha);
  return tagAtSha || shortSha;
};

const runDeploy = async (serviceAccountKey, service, runtimeAccountEmail, image) => {
  // Authenticate gcloud with our service-account
  const projectId = await glcoudAuth(serviceAccountKey);

  const runtimeAccount = await getRuntimeAccount(runtimeAccountEmail, projectId);

  const {
    name,
    memory,
    concurrency = 'default',
    'max-instances': maxInstances = 'default',
    environment = undefined,
    'cloudsql-instances': cloudSqlInstances = undefined,
  } = service;

  const args = ['run', 'deploy', name,
    `--image=${image}`,
    `--service-account=${runtimeAccount}`,
    `--project=${projectId}`,
    `--memory=${memory}`,
    `--concurrency=${concurrency}`,
    `--max-instances=${maxInstances}`,
    `--revision-suffix=${await revisionSuffix()}`,
  ];

  if (environment) {
    args.push(`--set-env-vars=${createEnvironmentArgs(environment, projectId)}`);
  } else {
    args.push('--clear-env-vars');
  }

  if (cloudSqlInstances) {
    args.push(`--set-cloudsql-instances=${cloudSqlInstances.join(',')}`);
  } else {
    args.push('--clear-cloudsql-instances');
  }

  if (service.platform.managed) {
    const {
      platform: {
        managed: {
          cpu = 1,
          region,
          'allow-unauthenticated': allowUnauthenticated,
        },
      },
    } = service;

    args.push(
      `--cpu=${cpu}`,
      '--platform=managed',
      `--region=${region}`,
    );

    if (allowUnauthenticated) {
      args.push('--allow-unauthenticated');
    } else {
      args.push('--no-allow-unauthenticated');
    }
  }

  if (service.platform.gke) {
    const {
      platform: {
        gke: {
          cpu = '1',
          cluster,
          'cluster-location': clusterLocation,
          connectivity,
          namespace = undefined,
        },
      },
    } = service;

    args.push(
      `--cpu=${cpu}`,
      '--platform=gke',
      `--cluster=${cluster}`,
      `--cluster-location=${clusterLocation}`,
      `--connectivity=${connectivity}`,
    );

    if (namespace) {
      args.push(`--namespace=${namespace}`);
    }
  }

  return exec.exec('gcloud', args);
};

module.exports = runDeploy;
