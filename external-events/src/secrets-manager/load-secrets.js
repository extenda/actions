import { loadSecret } from '../../../gcp-secret-manager/src/secrets.js';

/**
 * @param serviceAccountKey
 * @return {Promise<{key: string, email: string, pass: string, gipTenantId}>}
 */

async function loadSecrets(serviceAccountKey) {
  const getSecret = (name) => loadSecret(serviceAccountKey, name);

  return {
    key: await getSecret('iam-api-key-prod'),
    email: await getSecret('exe-api-email'),
    pass: await getSecret('exe-api-pass'),
    gipTenantId: await getSecret('exe-api-tenant-id'),
  };
}

export { loadSecrets };
