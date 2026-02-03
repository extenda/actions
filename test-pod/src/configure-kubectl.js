import cloudRunSchema from '../../cloud-run/src/cloud-run-schema.js';
import { getClusterInfo } from '../../cloud-run/src/cluster-info.js';
import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth.js';
import loadServiceDefinition from '../../cloud-run/src/service-definition.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';

const resolveClusterAndNamespace = (clusterInput, namespaceInput) => {
  if (clusterInput && namespaceInput) {
    return {
      cluster: clusterInput,
      name: '',
      namespace: namespaceInput,
    };
  }

  const service = loadServiceDefinition('cloud-run.yaml', cloudRunSchema);
  const {
    name,
    platform: {
      gke: {
        cluster = clusterInput || undefined,
        namespace = namespaceInput || name,
      } = {},
    } = {},
  } = service;

  return {
    cluster,
    name,
    namespace,
  };
};

const configureKubeCtl = async (
  serviceAccountKey,
  clusterInput,
  namespaceInput,
) => {
  // Authenticate GCloud
  const projectId = await setupGcloud(serviceAccountKey);

  // Resolve cluster and namespace.
  const { cluster, name, namespace } = resolveClusterAndNamespace(
    clusterInput,
    namespaceInput,
  );

  // Find cluster information
  const clusterInfo = await getClusterInfo(projectId, cluster);

  // Authenticate kubectl
  await authenticateKubeCtl(clusterInfo);

  return {
    ...clusterInfo,
    name,
    namespace,
  };
};

export default configureKubeCtl;
