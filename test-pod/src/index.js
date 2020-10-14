const core = require('@actions/core');
const { run } = require('../../utils');
const configureKubeCtl = require('./configure-kubectl');
const { createConfigMap, deleteConfigMap } = require('./configmap');
const runPod = require('./run-pod');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const namespace = core.getInput('namespace');
  const cluster = core.getInput('cluster');
  const entrypoint = core.getInput('entrypoint');
  const workingDirectory = core.getInput('working-directory');
  const outputPatternsInput = core.getInput('output-patterns');

  const outputPatterns = outputPatternsInput ? outputPatternsInput.split(/\s*,\s*/) : [];

  const clusterInfo = await configureKubeCtl(serviceAccountKey, cluster, namespace);

  const configMap = await createConfigMap(clusterInfo, workingDirectory, entrypoint);

  return runPod(clusterInfo, image, configMap, outputPatterns)
    .finally(() => (configMap ? deleteConfigMap(clusterInfo) : null));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
