const { loadSecretIntoEnv } = require('../../gcp-secret-manager/src/secrets');

const setupCredentials = async (serviceAccountKey, usernameKey, passwordKey) => {
  await loadSecretIntoEnv(serviceAccountKey, usernameKey, 'NEXUS_USERNAME');
  await loadSecretIntoEnv(serviceAccountKey, passwordKey, 'NEXUS_PASSWORD');
};

module.exports = setupCredentials;
