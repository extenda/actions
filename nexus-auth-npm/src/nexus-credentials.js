const { loadSecrets } = require('../../gcp-secret-manager/src/secrets');

/**
 * @param {string} serviceAccountKey
 */
const fetchNexusCredentials = async (serviceAccountKey) => {
  await loadSecrets(serviceAccountKey, {
    NEXUS_USERNAME: 'nexus-username',
    NEXUS_PASSWORD: 'nexus-password',
  });

  const username = process.env.NEXUS_USERNAME;
  const password = process.env.NEXUS_PASSWORD;

  return { username, password };
};

/**
 * @param {{ username: string, password: string, serviceAccountKey?: string }}
 * @returns {Promise<{ username: string, password: string }>}
 */
const validateOrFetchNexusCredentials = async ({ username, password, serviceAccountKey }) => {
  if (username && password) {
    return { username, password };
  }

  if (!serviceAccountKey) {
    throw new Error('Credentials are not found');
  }

  return fetchNexusCredentials(serviceAccountKey);
};

module.exports = { validateOrFetchNexusCredentials };
