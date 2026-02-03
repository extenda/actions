import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
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

// Entry point check removed for ESM compatibility

export default action;
