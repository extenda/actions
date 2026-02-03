import * as core from '@actions/core';

import { getTribeProject } from '../../cloud-run/src/cluster-info.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { failIfNotTrunkBased, run } from '../../utils/src/index.js';
import deployJob from './deploy-job.js';
import drainJob from './drain-job.js';

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

// Entry point check removed for ESM compatibility

export default action;
