import { getBooleanInput, getInput } from '@actions/core';

import { run } from '../../utils/src.js';
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

// Entry point check removed for ESM compatibility

export default action;
