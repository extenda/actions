import { getCurrentAccount, restorePreviousAccount } from './auth-gcloud.js';
import { cleanupCredentials } from './cleanup.js';
import { getTrackedCredentials } from './create-job-scoped-credential.js';
import setupGcloud from './setup-gcloud.js';

/**
 * Execute <code>fn</code> with gcloud signed in with the provided service account.
 * Gcloud is restored to its previous state before the method returns.
 * @template T the type returned by the callback function <code>fn</code>
 * @param {string} serviceAccountKey the Google Cloud service account key
 * @param {function(string): Promise<T>} fn an async function to execute
 * @return {Promise<T>} a promise that completes when the function has executed
 */
const withGcloud = async (serviceAccountKey, fn) => {
  const previousAccount = getCurrentAccount();
  try {
    const projectId = await setupGcloud(serviceAccountKey);
    return await fn(projectId);
  } finally {
    const didRestoreAccount = await restorePreviousAccount(previousAccount);
    if (!didRestoreAccount) {
      cleanupCredentials(getTrackedCredentials());
    }
  }
};

export default withGcloud;
