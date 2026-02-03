import core from '@actions/core';

import { run } from '../../utils/src';
import { execGcloud } from './exec-gcloud';
import setupGcloud from './setup-gcloud';
import withGcloud from './with-gcloud';

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
