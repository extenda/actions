const core = require('@actions/core');
const { run } = require('../../utils');
const kubectl = require('./kubectl');
const deploy = require('./deploy');
const createVariables = require('./env-vars');
const createManifests = require('./manifests');

const action = async () => {
  const deployServiceAccountKey = core.getInput('deploy-service-account-key', { required: true });
  const secretServiceAccountKey = core.getInput('secret-service-account-key', { required: true });
  const image = core.getInput('image', { required: true });
  const tenantName = core.getInput('tenant-name', { required: true });
  const countryCode = core.getInput('country-code') || '';

  const { projectId } = await kubectl.configure(deployServiceAccountKey);
  const vars = createVariables(projectId, image, tenantName, countryCode);

  await createManifests(secretServiceAccountKey, vars)
    .then(deploy);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
