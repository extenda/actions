const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const loadServiceDefinition = require('../../cloud-run/src/service-definition');
const cloudRunSchema = require('../../cloud-run/src/cloud-run-schema');

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

const configureKubeCtl = async (serviceAccountKey, clusterInput, namespaceInput) => {
  // Authenticate GCloud
  const projectId = await setupGcloud(
    serviceAccountKey,
    process.env.GCLOUD_INSTALLED_VERSION || 'latest',
  );

  // Resolve cluster and namespace.
  const { cluster, name, namespace } = resolveClusterAndNamespace(clusterInput, namespaceInput);

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


module.exports = configureKubeCtl;
