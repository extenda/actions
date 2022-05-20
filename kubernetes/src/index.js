const core = require('@actions/core');
const { run, failIfNotTrunkBased } = require('../../utils');
const runDeploy = require('./run-deploy');
const kubernetesSchema = require('./kubernetes-schema');
const loadServiceDefinition = require('../../cloud-run/src/service-definition');

const action = async () => {
  // Get params from action input
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'kubernetes.yaml';
  const image = core.getInput('image', { required: true });
  const dryRun = core.getInput('dry-run') === 'true';

  failIfNotTrunkBased();

  // Uses function from cloud-run action src to retrieve service definition from yaml file
  const service = loadServiceDefinition(serviceFile, kubernetesSchema);

  // Execute functions needed to deploy the application
  await runDeploy(serviceAccountKey, service, image, dryRun);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
