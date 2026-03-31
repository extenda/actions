import * as core from '@actions/core';

import { getCurrentAccount } from './auth-gcloud.js';
import { execGcloud } from './exec-gcloud.js';

/**
 * Get the ID token for the current CI/CD service account.
 * @param audience the audience to use
 * @return {Promise<string>} the ID token
 * @throws Error if no CI/CD account is authenticated
 */
export async function getIdToken(audience) {
  const account = getCurrentAccount();
  if (!account) {
    throw new Error('No authenticated service account');
  }

  const args = ['auth', 'print-identity-token', `--audiences=${audience}`];

  if (account.type === 'wid_federation') {
    args.push(
      `--impersonate-service-account=${account.email}`,
      '--include-email',
    );
  }

  const idToken = await execGcloud(args, 'gcloud', true);
  core.setSecret(idToken);
  return idToken;
}
