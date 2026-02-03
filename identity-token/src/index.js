import core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud';
import { run } from '../../utils/src';
import fetchToken from './fetch-token';

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

if (require.main === module) {
  run(action);
}

module.exports = action;
