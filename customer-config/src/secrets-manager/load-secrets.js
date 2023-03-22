const { loadSecret } = require('../../../gcp-secret-manager/src/secrets');

/**
 * @param serviceAccountKey
 * @return {Promise<{key: string, email: string, pass: string, gipTenantId}>}
 */

async function loadSecrets(serviceAccountKey) {
  const getSecret = (name) => loadSecret(serviceAccountKey, name);

  return {
    key: await getSecret('iam-api-key-prod'),
    email: await getSecret('ccc-sync-admin'),
    pass: await getSecret('ccc-sync-pass'),
    gipTenantId: await getSecret('exe-api-tenant-id'),
  };
}

module.exports = { loadSecrets };
