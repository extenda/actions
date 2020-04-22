const core = require('@actions/core');
const exec = require('@actions/exec');

const getNamespace = async (namespace) => {
  try {
    await exec.exec('kubectl', [
      'get',
      'namespace',
      namespace,
    ]);
  } catch (err) {
    if (err.message.includes('(NotFound)')) {
      return false;
    }
    throw new Error(`Couldn't get namespace information! reason: ${err.message}`);
  }
  return true;
};

const setLabel = async (namespace, label, value) => exec.exec('kubectl', [
  'label',
  'namespace',
  namespace,
  `${label}=${value}`,
  '--overwrite=true',
]);

const createNamespace = async (opaEnabled, { project, cluster, clusterLocation }, namespace) => {
  const opaInjection = opaEnabled ? 'enabled' : 'disabled';

  // Authenticate kubectl
  await exec.exec('gcloud', [
    'container',
    'clusters',
    'get-credentials',
    cluster,
    `--region=${clusterLocation}`,
    `--project=${project}`,
  ]);

  if (!await getNamespace(namespace)) {
    core.info(`creating namespace ${namespace}`);
    await exec.exec('kubectl', ['create', 'namespace', namespace]);

    // TODO: create kubernetes service account and map to(annotate) Google
    // service account for workload identity
  }
  await setLabel(namespace, 'opa-istio-injection', opaInjection);
  await setLabel(namespace, 'istio-injection', opaInjection);

  // TODO: update OPA config map
};

module.exports = createNamespace;
