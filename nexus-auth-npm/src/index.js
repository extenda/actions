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

  createNpmrcFile({
    credentials,
    outputDir,
    authForPublishing,
  });
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
