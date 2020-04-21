// eslint-disable-next-line no-unused-vars
const core = require('@actions/core');
// eslint-disable-next-line no-unused-vars
const exec = require('@actions/exec');

const getNamespace = async (namespace) => {
  let output = '';
  await exec.exec('kubectl', [
    'get',
    'namespace',
    namespace,
  ],{
    listeners: {
      stdout: (data) => {
        output = data.toString('utf8');
      },
    },
  });
  return output.trim();
};

const setLabel = async (namespace, label, value) => exec.exec('kubectl', [
  'label',
  'namespace',
  namespace,
  `${label}=${value}`,
  '--overwrite=true',
]);

// eslint-disable-next-line no-unused-vars
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

  const response = await getNamespace(namespace);
  if(response.includes('(NotFound)')){

    core.info(`creating namespace ${namespace}`)

    // TODO: create kubernetes service account and map to(annotate) Google service account for workload identity

    await exec.exec(`kubectl create namespace ${namespace}`)
  }
  await setLabel(namespace, 'opa-istio-injection', opaInjection)
  await setLabel(namespace, 'istio-injection', opaInjection)

  // TODO: update OPA config map

};

module.exports = createNamespace;
