import * as core from '@actions/core';

import { execGcloud } from './exec-gcloud.js';
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

// Entry point check removed for ESM compatibility

export { action, execGcloud, setupGcloud, withGcloud };
