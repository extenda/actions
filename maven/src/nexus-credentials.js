import { loadSecretIntoEnv } from '../../gcp-secret-manager/src/secrets.js';

const setupCredentials = async (
  serviceAccountKey,
  usernameKey,
  passwordKey,
) => {
  await loadSecretIntoEnv(
    serviceAccountKey,
    usernameKey,
    'NEXUS_USERNAME',
    true,
  );
  await loadSecretIntoEnv(
    serviceAccountKey,
    passwordKey,
    'NEXUS_PASSWORD',
    true,
  );
};

export default setupCredentials;
