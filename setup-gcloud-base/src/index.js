const core = require('@actions/core');
const { run } = require('../../utils/src');
const setupGcloud = require('./setup-gcloud');

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const version = core.getInput('version') || 'latest';
  const exportCredentials = core.getInput('export-default-credentials') || 'false';
  const gcloudIsCached = core.getInput('cache') || 'false';
  await setupGcloud(serviceAccountKey, gcloudIsCached, version, exportCredentials === 'true');
});
