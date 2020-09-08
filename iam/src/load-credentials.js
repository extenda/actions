const core = require('@actions/core');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const { checkEnv } = require('../../utils');

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
  const iamApiEmailName = `iam-api-email-${(env === 'staging') ? 'staging' : 'prod'}`;
  const iamApiPasswordName = `iam-api-password-${(env === 'staging') ? 'staging' : 'prod'}`;
  const iamApiKeyName = `iam-api-key-${(env === 'staging') ? 'staging' : 'prod'}`;
  const iamApiTenantName = `iam-api-tenantId-${(env === 'staging') ? 'staging' : 'prod'}`;

  const styraToken = await getSecret(serviceAccountKey, 'styra-das-token', 'STYRA_TOKEN');
  const iamApiEmail = await getSecret(serviceAccountKey, iamApiEmailName, 'API_EMAIL');
  const iamApiPassword = await getSecret(serviceAccountKey, iamApiPasswordName, 'API_PASSWORD');
  const iamApiKey = await getSecret(serviceAccountKey, iamApiKeyName, 'API_KEY');
  const iamApiTenant = await getSecret(serviceAccountKey, iamApiTenantName, 'API_TENANT');

  return {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  };
};

module.exports = loadCredentials;
