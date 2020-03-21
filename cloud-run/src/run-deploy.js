const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const getRuntimeAccount = require('./runtime-account');

const glcoudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const runDeploy = async (serviceAccountKey, service, runtimeAccountEmail, image) => {
  // Authenticate gcloud with our service-account
  const projectId = await glcoudAuth(serviceAccountKey);

  const runtimeAccount = await getRuntimeAccount(runtimeAccountEmail, projectId);

  const args = ['run', 'deploy', service.name,
    `--image=${image}`,
    `--service-account=${runtimeAccount}`,
    `--project=${projectId}`,
    `--memory=${service.memory}`,
  ];

  if (service.allowUnauthenticated) {
    args.push('--allow-unauthenticated');
  }

  if (service.runsOn.platform === 'managed') {
    args.push(
      '--platform=managed',
      `--region=${service.runsOn.region}`,
    );
  } else {
    args.push(
      '--platform=gke',
      `--cluster=${service.runsOn.cluster}`,
      `--cluster-location=${service.runsOn.clusterLocation}`,
    );
  }

  return exec.exec('gcloud', args);
};

module.exports = runDeploy;
