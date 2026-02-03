import core from '@actions/core';

import { getTribeProject } from '../../cloud-run/src/cluster-info';
import { setupGcloud } from '../../setup-gcloud';
import { failIfNotTrunkBased, run } from '../../utils';
import deployJob from './deploy-job';
import drainJob from './drain-job';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const jobName = core.getInput('job-name', { required: true });
  const jobVersion = core.getInput('job-version', { required: true });
  const dataflowServiceAccount = core.getInput('dataflow-service-account', {
    required: true,
  });
  const templatePath = core.getInput('template-path', { required: true });
  const jobType = core.getInput('job-type') || 'job';
  const parameters = core.getInput('parameters') || '';
  const stagingLocation = core.getInput('staging-location') || '';
  const region = core.getInput('region') || 'europe-west1';
  const network = core.getInput('network') || 'tribe-network';
  const maxWorkers = core.getInput('max-workers') || '';
  const numWorkers = core.getInput('num-workers') || '';

  failIfNotTrunkBased();

  const newJobName = `${jobName}-${jobVersion}`;

  const projectId = await setupGcloud(serviceAccountKey);
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
    maxWorkers,
    numWorkers,
  ).then((jobId) => drainJob(jobId, jobName, region, projectId));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
