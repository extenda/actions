const core = require('@actions/core');
const { run } = require('../../utils');
const kubectl = require('./kubectl');
const deploy = require('./deploy');
const prepareEnvConfig = require('./env-config');
const createManifests = require('./manifests');

const action = async () => {
  const deployServiceAccountKey = core.getInput('deploy-service-account-key', { required: true });
  const secretServiceAccountKey = core.getInput('secret-service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const tenantName = core.getInput('tenant-name', { required: true });
  const countryCode = core.getInput('country-code') || '';
  const timeoutSeconds = core.getInput('deploy-timeout') || 180;
  const inputEnvironment = core.getInput('environment');

  const projectId = await kubectl.configure(deployServiceAccountKey);

  const envConfig = await prepareEnvConfig(
    deployServiceAccountKey,
    projectId,
    image,
    tenantName,
    countryCode,
    inputEnvironment,
  );

  await createManifests(secretServiceAccountKey, envConfig)
    .then((manifest) => deploy(manifest, timeoutSeconds));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
