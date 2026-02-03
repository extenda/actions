import * as core from '@actions/core';

import { loadSecret } from '../../gcp-secret-manager/src/secrets.js';
import { checkEnv } from '../../utils';

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
  const iamApiEmailName = `iam-api-email-${env}`;
  const iamApiPasswordName = `iam-api-password-${env}`;
  const iamApiKeyName = `iam-api-key-${env}`;
  const iamApiTenantName = `iam-api-tenantId-${env}`;

  core.info(`Load credentials for ${env}`);

  const styraToken = await getSecret(
    serviceAccountKey,
    'styra-das-token',
    'STYRA_TOKEN',
  );
  const iamApiEmail = await getSecret(
    serviceAccountKey,
    iamApiEmailName,
    `API_EMAIL_${env}`,
  );
  const iamApiPassword = await getSecret(
    serviceAccountKey,
    iamApiPasswordName,
    `API_PASSWORD_${env}`,
  );
  const iamApiKey = await getSecret(
    serviceAccountKey,
    iamApiKeyName,
    `API_KEY_${env}`,
  );
  const iamApiTenant = await getSecret(
    serviceAccountKey,
    iamApiTenantName,
    `API_TENANT_${env}`,
  );

  return {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  };
};

export default loadCredentials;
