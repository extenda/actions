import * as core from '@actions/core';

import { loadSecret } from '../../../gcp-secret-manager/src/secrets.js';
import { checkEnv } from '../../../utils.js';

const getSecret = async (serviceAccountKey, secretName, envVar) => {
  let secret;
  if (process.env[envVar]) {
    core.debug(`Using explicit ${envVar} env var`);
    secret = process.env[envVar];
  } else if (serviceAccountKey) {
    core.debug(`Load '${secretName}' from secret manager`);
    secret = await loadSecret(serviceAccountKey, secretName);
    process.env[envVar] = secret;
  } else {
    checkEnv([envVar]);
  }
  return secret;
};

const readSecret = async (serviceAccountKey, env, secretName, envName) => {
  core.info(`Load secret ${secretName} for ${env}`);
  return getSecret(serviceAccountKey, secretName, envName);
};

export default readSecret;
