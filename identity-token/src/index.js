const core = require('@actions/core');
const fetchToken = require('./fetch-token');
const { run } = require('../../utils/src');
const { setupGcloud } = require('../../setup-gcloud');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceAccount = core.getInput('service-account', { required: true });
  const audiences = core.getInput('audiences', { required: true });

  await setupGcloud(serviceAccountKey);
  const token = await fetchToken(serviceAccount, audiences);
  core.setSecret(token);
  core.exportVariable('IDENTITY_TOKEN', token);
  core.setOutput('identity-token', token);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
