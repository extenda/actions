import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { run } from '../../utils/src/index.js';
import fetchToken from './fetch-token.js';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const serviceAccount = core.getInput('service-account', { required: true });
  const audiences = core.getInput('audiences', { required: true });

  await setupGcloud(serviceAccountKey);
  const token = await fetchToken(serviceAccount, audiences);
  core.setSecret(token);
  core.exportVariable('IDENTITY_TOKEN', token);
  core.setOutput('identity-token', token);
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
