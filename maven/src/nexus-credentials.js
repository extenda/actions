const { loadSecretIntoEnv } = require('../../gcp-secret-manager/src/secrets');

const setupCredentials = async (serviceAccountKey, usernameKey, passwordKey) => {
  await loadSecretIntoEnv(serviceAccountKey, usernameKey, 'NEXUS_USERNAME', true);
  await loadSecretIntoEnv(serviceAccountKey, passwordKey, 'NEXUS_PASSWORD', true);
};

module.exports = setupCredentials;
