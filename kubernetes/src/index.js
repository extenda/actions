const core = require('@actions/core');
const { run } = require('../../utils');
const runDeploy = require('./run-deploy');
const kubernetesSchema = require('./kubernetes-schema');
const loadServiceDefinition = require('../../cloud-run/src/service-definition');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'kubernetes.yaml';
  const image = core.getInput('image', { required: true });

  const service = loadServiceDefinition(serviceFile, kubernetesSchema);
  await runDeploy(serviceAccountKey, service, image);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
