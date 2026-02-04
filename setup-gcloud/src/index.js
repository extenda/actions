
import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';
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

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export { action, execGcloud, setupGcloud, withGcloud };
