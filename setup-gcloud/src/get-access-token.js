import * as core from '@actions/core';

import { authType, getCurrentAccount } from './auth-gcloud.js';
import { execGcloud } from './exec-gcloud.js';

async function introspectToken(accessToken) {
  if (core.isDebug()) {
    const params = new URLSearchParams();
    params.append('access_token', accessToken);
    await fetch('https://oauth2.googleapis.com/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
      .then((response) => response.json())
      .then((tokenInfo) =>
        core.debug(`Token info: ${JSON.stringify(tokenInfo, null, 2)}`),
      )
      .catch((err) => core.error(`Failed to debug token info: ${err.message}`));
  }
}

/**
 * Get an access token valid for 60 minutes representing the GCP service account. This token will take precedence of
 * all other credential types when google-auth SDKs are used.
 *
 * @return {Promise<string>} the access token
 */
export async function getAccessToken() {
  const current = getCurrentAccount();
  if (!current) {
    return null;
  }

  const { type, email } = current;

  const args = ['auth', 'print-access-token'];
  if (type === authType.widFederation) {
    args.push(`--impersonate-service-account=${email}`);
  }

  const accessToken = await execGcloud(args, 'gcloud', true).catch((err) => {
    core.warning(
      'Missing permissions to create a long-lived access token. Short-lived 10 minute tokens will be used.',
    );
    core.debug(err.message);
    return null;
  });

  if (accessToken) {
    core.setSecret(accessToken);
    await introspectToken(accessToken);
  }

  return accessToken;
}
