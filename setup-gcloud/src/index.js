const core = require('@actions/core');
const { run } = require('../../utils');
const setupGcloud = require('./setup-gcloud');

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const version = core.getInput('version') || 'latest';
  const exportCredentials = core.getInput('export-default-credentials') || 'false';
  const useCache = core.getInput('cache') || 'true';
  await setupGcloud(serviceAccountKey, useCache, version, exportCredentials === 'true');
});
