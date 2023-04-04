const exec = require('@actions/exec');
const setupGcloud = require('../../../setup-gcloud/src/setup-gcloud');
const { getClusterInfo } = require('../utils/cluster-info');
const authenticateKubeCtl = require('../../../cloud-run/src/kubectl-auth');

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

const kubectl = async (args) => exec.exec('kubectl', args);

module.exports = {
  configure,
  exec: kubectl,
};
