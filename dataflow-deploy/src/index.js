const core = require('@actions/core');
const { run } = require('../../utils');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const deployJob = require('./deploy-job');
const drainJob = require('./drain-job');

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

  const newJobName = `${jobName}-${jobVersion}`;

  const projectId = await setupGcloud(serviceAccountKey, process.env.GCLOUD_INSTALLED_VERSION || 'latest');

  await deployJob(
    newJobName,
    parameters,
    dataflowServiceAccount,
    templatePath,
    region,
    projectId,
    jobType,
    stagingLocation,
  )
    .then(() => drainJob(jobName, newJobName, region, projectId));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
