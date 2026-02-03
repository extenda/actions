import exec from '@actions/exec';

import { getClusterInfo } from '../../cloud-run/src/cluster-info';
import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth';
import { setupGcloud } from '../../setup-gcloud';

const configure = async (serviceAccountKey) => {
  // Authenticate GCloud
  const projectId = await setupGcloud(serviceAccountKey);

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
