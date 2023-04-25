const exec = require('@actions/exec');
const setupGcloud = require('../../../setup-gcloud/src/setup-gcloud');
const { getClusterDetails } = require('./cluster-info');
const gcloudOutput = require('./gcloud-output');

const configure = async (serviceAccountKey) => {
  // Authenticate GCloud
  const projectId = await setupGcloud(
    serviceAccountKey,
    process.env.GCLOUD_INSTALLED_VERSION || 'latest',
  );

  // Find cluster information
  const clusterInfo = await getClusterInfo(projectId);

  // Authenticate kubectl
  await authenticateKubeCtl(clusterInfo);

  return projectId;
};

const configureProject = async (projectID) => {

  // Find cluster information
  const clusterInfo = await getClusterDetails(projectID);
  // Authenticate kubectl
  await authenticateKubeCtl(clusterInfo);

  return projectID;
};

const authenticateKubeCtl = async ({ cluster, clusterLocation, project }) => gcloudOutput([
  'container',
  'clusters',
  'get-credentials',
  cluster,
  `--region=${clusterLocation}`,
  `--project=${project}`,
]);

const kubectl = async (args) => exec.exec('kubectl', args);

module.exports = {
  configure,
  configureProject,
  exec: kubectl,
  authenticateKubeCtl,
};
