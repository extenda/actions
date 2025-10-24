const core = require('@actions/core');
const { run } = require('../../utils/src');
const setupGcloud = require('./setup-gcloud');
const { execGcloud } = require('./exec-gcloud');
const withGcloud = require('./with-gcloud');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const version = core.getInput('version') || 'latest';
  const exportCredentials =
    core.getInput('export-default-credentials') || 'false';
  await setupGcloud(serviceAccountKey, version, exportCredentials === 'true');
};

if (require.main === module) {
  run(action);
}

module.exports = {
  action,
  setupGcloud,
  execGcloud,
  withGcloud,
};
