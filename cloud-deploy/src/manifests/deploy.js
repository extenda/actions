const core = require('@actions/core');
const gcloudOutput = require('../utils/gcloud-output');
const { retryUntil } = require('../utils/retry-until');

const allowAllRequests = async (projectID, name) => gcloudOutput([
  'run',
  'services',
  'add-iam-policy-binding',
  name,
  '--member=allUsers',
  '--role=roles/run.invoker',
  '--region=europe-west1',
  `--project=${projectID}`,
]);

const deployRelease = async (projectID, name, version) => gcloudOutput([
  'deploy',
  'releases',
  'create',
  `${name}-${version}`,
  `--delivery-pipeline=${name}`,
  `--project=${projectID}`,
  '--region=europe-west1',
]);

const applyDeployment = async (projectID) => gcloudOutput([
  'deploy',
  'apply',
  '--file=clouddeploy.yaml',
  `--project=${projectID}`,
  '--region=europe-west1',
]);

const getDeployState = async (projectID, name, version) => gcloudOutput([
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

const deploy = async (projectID, name, version, platformGKE) => {
  const success = await runGcloudDeploy(projectID, name, version);
  if (success) {
    core.info(`Deployment of ${name} completed successfully`);
    if (!platformGKE) {
      await allowAllRequests(projectID, name);
    }
    return true;
  }
  core.info(`Deployment of ${name} failed`);
  return false;
};

module.exports = deploy;
