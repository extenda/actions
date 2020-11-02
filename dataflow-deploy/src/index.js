const core = require('@actions/core');
const { run } = require('../../utils');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const deployJob = require('./deploy-job');
const drainJob = require('./drain-job');
const { getTribeProject } = require('../../cloud-run/src/cluster-info');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const jobName = core.getInput('job-name', { required: true });
  const jobVersion = core.getInput('job-version', { required: true });
  const dataflowServiceAccount = core.getInput('dataflow-service-account', { required: true });
  const templatePath = core.getInput('template-path', { required: true });
  const jobType = core.getInput('job-type') || 'job';
  const parameters = core.getInput('parameters') || '';
  const stagingLocation = core.getInput('staging-location') || '';
  const region = core.getInput('region') || 'europe-west1';
  const network = core.getInput('network') || 'tribe-network';

  const newJobName = `${jobName}-${jobVersion}`;

  const projectId = await setupGcloud(serviceAccountKey, process.env.GCLOUD_INSTALLED_VERSION || 'latest');
  const tribeProject = await getTribeProject(projectId);
  const subnetwork = `https://www.googleapis.com/compute/v1/projects/${tribeProject}/regions/${region}/subnetworks/clan-resources`;

  await deployJob(
    newJobName,
    parameters,
    dataflowServiceAccount,
    templatePath,
    region,
    projectId,
    jobType,
    stagingLocation,
    network,
    subnetwork,
  )
    .then(() => drainJob(jobName, newJobName, region, projectId));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
