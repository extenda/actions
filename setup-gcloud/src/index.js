const core = require('@actions/core');
const { run } = require('../../utils');
const setupGcloud = require('./setup-gcloud');

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const version = core.getInput('version') || 'latest';
  await setupGcloud(serviceAccountKey, version);
});
