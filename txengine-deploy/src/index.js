const core = require('@actions/core');
const yaml = require('yaml');
const { run } = require('../../utils');
const kubectl = require('./kubectl');
const deploy = require('./deploy');
const createVariables = require('./env-vars');
const createManifests = require('./manifests');

const parseEnvironment = (environment, projectId) => {
  if (!environment) {
    return {};
  }
  return yaml.parse(environment.replace(/sm:\/\/\*\//g, `sm://${projectId}/`));
};

const action = async () => {
  const deployServiceAccountKey = core.getInput('deploy-service-account-key', { required: true });
  const secretServiceAccountKey = core.getInput('secret-service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const tenantName = core.getInput('tenant-name', { required: true });
  const countryCode = core.getInput('country-code') || '';
  const timeoutSeconds = core.getInput('timeout-seconds');

  const { projectId } = await kubectl.configure(deployServiceAccountKey);

  const additionalEnvironment = parseEnvironment(core.getInput('environment'), projectId);
  const defaultEnvironment = createVariables(projectId, image, tenantName, countryCode);

  await createManifests(secretServiceAccountKey, defaultEnvironment, additionalEnvironment)
    .then((manifest) => deploy(manifest, timeoutSeconds));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
