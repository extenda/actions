import { execGcloud } from './exec-gcloud.js';

/**
 * Authenticate gcloud with provided service account.
 * @param tmpKeyFile the temporary service account key file
 * @returns {Promise<{googleCredentials: string}>} a promise that completes with the google credentials key file
 */
export const authenticateJsonKey = async (tmpKeyFile) => {
  await execGcloud([
    '--quiet',
    'auth',
    'activate-service-account',
    '--key-file',
    tmpKeyFile,
  ]);

  return {
    googleCredentials: tmpKeyFile,
  };
};

export async function configureServiceAccount(email) {
  await execGcloud(['config', 'set', 'account', email], 'gcloud', true);
}
