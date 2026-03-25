import { getCurrentAccount } from './auth-gcloud.js';
import { execGcloud } from './exec-gcloud.js';

/**
 * Returns the email of the currently authenticated service account.
 * @return {string} the email of the currently authenticated service account
 * @throws Error if no user is authenticated
 */
function getServiceAccountEmail() {
  const account = getCurrentAccount();
  if (!account) {
    throw new Error('No authenticated service account');
  }
  return account.email;
}

/**
 * Get the ID token for the current CI/CD service account.
 * @param audience the audience to use
 * @return {Promise<string>} the ID token
 * @throws Error if no CI/CD account is authenticated
 */
export async function getIdToken(audience) {
  const serviceAccountEmail = getServiceAccountEmail();
  return execGcloud(
    [
      'auth',
      'print-identity-token',
      `--audiences=${audience}`,
      `--impersonate-service-account=${serviceAccountEmail}`,
      '--include-email',
    ],
    'gcloud',
    true,
  );
}
