const core = require('@actions/core');
const { loadSecret } = require('../../../gcp-secret-manager/src/secrets');
const { checkEnv } = require('../../../utils');

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

const loadCredentials = async (serviceAccountKey, env) => {
  core.info(`Load credentials for ${env}`);
  return getSecret(serviceAccountKey, 'styra-das-token', 'STYRA_TOKEN');
};

module.exports = loadCredentials;
