import * as exec from '@actions/exec';

import { getClusterInfo } from '../../cloud-run/src/cluster-info.js';
import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';

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

export default { configure, exec: kubectl };
