const core = require('@actions/core');
const { run } = require('../../utils');
const kubectl = require('./kubectl');
const deploy = require('./deploy');
const prepareEnvConfig = require('./env-config');
const createManifests = require('./manifests');
const configureDomains = require('./configure-domains');

const action = async () => {
  const deployServiceAccountKey = core.getInput('deploy-service-account-key', { required: true });
  const secretServiceAccountKey = core.getInput('secret-service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const tenantName = core.getInput('tenant-name', { required: true });
  const countryCode = core.getInput('country-code') || '';
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

  const manifest = await createManifests(secretServiceAccountKey, envConfig);
  await deploy(manifest);
  await configureDomains(projectId.includes('-staging-') ? 'staging' : 'prod', tenantName, countryCode);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
