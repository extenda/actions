const gcloudOutput = require('../utils/gcloud-output');
const core = require('@actions/core');

const FIVE_MINUTES = 300000;
const timer = (ms) => new Promise((res) => {
  setTimeout(res, ms);
});

const deployRelease = async (projectID, name, version) => await gcloudOutput([
  'deploy',
  'releases',
  'create',
  `${name}-${version}`,
  `--delivery-pipeline=${name}`,
  `--project=${projectID}`,
  '--region=europe-west1',
]);

const applyDeployment = async (projectID) => await gcloudOutput([
    'deploy',
    'apply',
    '--file=clouddeploy.yaml',
    `--project=${projectID}`,
    '--region=europe-west1',
  ]);

const getDeployState = async (projectID, name, version) => await gcloudOutput([
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
  const sleepMs = 10000;
  const timeoutMs = FIVE_MINUTES;
  const t0 = Date.now();
  let status = '';
  /* eslint-disable no-await-in-loop */
  do {
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`Timed out waiting for deployment to become ready!`);
    }
    await timer(sleepMs);
    status = await getDeployState(projectID, name, version);
    core.info(`Deploy status is: ${status}`);
  } while (status !== 'SUCCEEDED' && status !== 'FAILED');
  /* eslint-enable no-await-in-loop */
  return status === 'SUCCEEDED';
}

const deploy = async (projectID, name, version) => {
  const success = await runGcloudDeploy(projectID, name, version);
  if (success) {
    core.info(`Deployment of ${name} completed successfully`);
    return true;
  } else {
    core.info(`Deployment of ${name} failed`);
    return false;
  }
}

module.exports = deploy;