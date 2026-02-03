import * as core from '@actions/core';

import { execGcloud } from './exec-gcloud.js';
import setupGcloud from './setup-gcloud.js';

const getGcloudAccount = async () =>
  execGcloud(['config', 'get', 'account', '--format=json'], 'gcloud', true)
    .then(JSON.parse)
    .then((account) => {
      if (typeof account === 'string' && account.length > 0) {
        return account;
      }
      return null;
    })
    .catch(() => null);

const restorePreviousGcloudAccount = async (previousAccount) => {
  const current = await getGcloudAccount();
  if (previousAccount !== current) {
    core.info(`Restore gcloud account ${previousAccount}`);
    await execGcloud(
      ['config', 'set', 'account', previousAccount],
      'gcloud',
      true,
    );
  }
};

/**
 * Execute <code>fn</code> with gcloud signed in with the provided service account.
 * Gcloud is restored to its previous state before the method returns.
 * @template T the type returned by the callback function <code>fn</code>
 * @param {string} serviceAccountKey the google cloud service account key
 * @param {function(string): Promise<T>} fn an async function to execute
 * @return {Promise<T>} a promise that completes when the function has executed
 */
const withGcloud = async (serviceAccountKey, fn) => {
  let previousAccount;
  if (process.env.GCLOUD_INSTALLED_VERSION) {
    previousAccount = await getGcloudAccount();
  }

  let result;
  try {
    const projectId = await setupGcloud(serviceAccountKey);
    result = await fn(projectId);
  } finally {
    if (previousAccount) {
      await restorePreviousGcloudAccount(previousAccount);
    }
  }
  return result;
};

export default withGcloud;
