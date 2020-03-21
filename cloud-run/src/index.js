const core = require('@actions/core');
const { run } = require('../../utils');
const loadServiceDefinition = require('./service-definition');
const runDeploy = require('./run-deploy');

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition', { required: true });
  const runtimeAccountEmail = core.getInput('runtime-account-email', { required: true });
  const image = core.getInput('image', { required: true });

  const service = loadServiceDefinition(serviceFile);

  await runDeploy(serviceAccountKey, service, runtimeAccountEmail, image);
});
