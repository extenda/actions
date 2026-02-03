import { getBooleanInput, getInput } from '@actions/core';

import { run } from '../../utils/src/index.js';
import { validateOrFetchNexusCredentials } from './nexus-credentials.js';
import { createNpmrcFile } from './npmrc.js';

const action = async () => {
  const username = getInput('nexus-username') || process.env.NEXUS_USERNAME;
  const password = getInput('nexus-password') || process.env.NEXUS_PASSWORD;
  const serviceAccountKey = getInput('service-account-key');
  const outputDir = getInput('npmrc-dir') || '.';
  const authForPublishing = getBooleanInput('auth-for-publishing') || false;

  const credentials = await validateOrFetchNexusCredentials({
    username,
    password,
    serviceAccountKey,
  });

  await createNpmrcFile({
    credentials,
    outputDir,
    authForPublishing,
  });
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
