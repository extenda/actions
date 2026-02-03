import core from '@actions/core';

import { run } from '../../utils';
import { createConfigMap, deleteConfigMap } from './configmap';
import configureKubeCtl from './configure-kubectl';
import runPod from './run-pod';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const image = core.getInput('image', { required: true });
  const namespace = core.getInput('namespace');
  const cluster = core.getInput('cluster');
  const entrypoint = core.getInput('entrypoint');
  const workingDirectory = core.getInput('working-directory');
  const trimPrefix = core.getInput('trim-prefix') === 'true';

  const clusterInfo = await configureKubeCtl(
    serviceAccountKey,
    cluster,
    namespace,
  );

  const configMap = await createConfigMap(
    clusterInfo,
    workingDirectory,
    entrypoint,
  );

  return runPod(clusterInfo, image, configMap, trimPrefix).finally(() =>
    configMap ? deleteConfigMap(clusterInfo) : null,
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
