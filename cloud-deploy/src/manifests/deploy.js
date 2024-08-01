const core = require('@actions/core');
const gcloudOutput = require('../utils/gcloud-output');
const { retryUntil } = require('../utils/retry-until');
const cleanRevisions = require('../cloudrun/clean-revisions');
const { projectWithoutNumbers } = require('../utils/clan-project-name');
const setupAuthorization = require('../cloudrun/iam-bindings');

const deployRelease = async (projectID, name, version) =>
  gcloudOutput([
    'deploy',
    'releases',
    'create',
    `${name}-${version}`,
    `--delivery-pipeline=${name}`,
    `--project=${projectID}`,
    '--region=europe-west1',
  ]);

const applyDeployment = async (projectID) =>
  gcloudOutput([
    'deploy',
    'apply',
    '--file=clouddeploy.yaml',
    `--project=${projectID}`,
    '--region=europe-west1',
  ]);

const getDeployState = async (projectID, name, version) =>
  gcloudOutput([
    'deploy',
    'rollouts',
    'list',
    `--project=${projectID}`,
    '--region=europe-west1',
    `--release=${name}-${version}`,
    `--delivery-pipeline=${name}`,
    '--format=get(state)',
  ]);

const runGcloudDeploy = async (projectID, name, version) => {
  await applyDeployment(projectID);
  await deployRelease(projectID, name, version);

  core.info(`Waiting for deployment "${name}" to become active...`);

  const status = await retryUntil(
    () => getDeployState(projectID, name, version),
    (value) => {
      core.info(`Deploy status is: ${value}`);
      // Stop polling if status is terminal.
      return value === 'SUCCEEDED' || value === 'FAILED';
    },
  );
  return status === 'SUCCEEDED';
};

const deploy = async (projectID, name, version, platformGKE, accounts = []) => {
  const success = await runGcloudDeploy(projectID, name, version);
  if (success) {
    core.info(`Deployment of ${name} completed successfully`);
    if (!platformGKE) {
      await setupAuthorization(projectID, name, accounts);
    }
  } else {
    core.error(`Deployment of ${name} failed`);
    core.info(
      `pipeline link: https://console.cloud.google.com/deploy/delivery-pipelines/europe-west1/${name}?project=${projectID}`,
    );
    const project = projectWithoutNumbers(projectID);
    const clan = project.split('-')[0];
    const env = project.split('-')[1];
    let link = `https://console.cloud.google.com/run/detail/europe-west1/${name}/logs?project=${projectID}`;
    if (platformGKE) {
      link = `https://console.cloud.google.com/kubernetes/deployment/europe-west1/${clan}-cluster-${env}/${name}/${name}/logs?project=${projectID}`;
    }
    core.info(`logs link: ${link}`);
  }

  if (!platformGKE) {
    await cleanRevisions(name, projectID, 'europe-west1', 3);
  }

  return success;
};

module.exports = deploy;
