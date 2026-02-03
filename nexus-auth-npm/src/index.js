import { getBooleanInput, getInput } from '@actions/core';

import { run } from '../../utils/src';
import { validateOrFetchNexusCredentials } from './nexus-credentials';
import { createNpmrcFile } from './npmrc';

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

if (require.main === module) {
  run(action);
}

module.exports = action;
