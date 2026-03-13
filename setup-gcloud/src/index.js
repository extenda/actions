import * as core from '@actions/core';

import setupGcloud from './setup-gcloud.js';
import withGcloud from './with-gcloud.js';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const version = core.getInput('version') || 'latest';
  const exportCredentials =
    core.getInput('export-default-credentials') || 'false';
  await setupGcloud(serviceAccountKey, version, exportCredentials === 'true');
};

export default action;

export { execGcloud } from './exec-gcloud.js';
export { copyCredentials } from './setup-gcloud.js';

export { action, setupGcloud, withGcloud };
