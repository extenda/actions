import { fileURLToPath } from 'node:url';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
