import * as core from '@actions/core';

import { clearAuthStack, loadAuthStack, saveAuthStack } from './auth-stack.js';
import {
  refreshIdToken,
  workloadIdentityFederation,
} from './auth-wid-federation.js';
import createJobScopedCredential from './create-job-scoped-credential.js';

const authType = {
  jsonKey: 'json_key',
  widFederation: 'wid_federation',
};

export const env = {
  accessToken: 'CLOUDSDK_AUTH_ACCESS_TOKEN',
  applicationCredentials: 'GOOGLE_APPLICATION_CREDENTIALS',
  credentialsOverride: 'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
  projectId: 'CLOUDSDK_CORE_PROJECT',
};

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

function parseCredentials(credentials) {
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(credentials, 'base64').toString('utf8'));
  } catch {
    throw new Error(
      'Invalid service-account-key: expected base64-encoded JSON credentials',
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'Invalid service-account-key: expected base64-encoded JSON credentials',
    );
  }

  return parsed;
}

function validateCredentialsShape(jsonCredentials) {
  if (!isNonEmptyString(jsonCredentials.project_id)) {
    throw new Error(
      'Invalid service-account-key: missing required field "project_id"',
    );
  }

  if (isNonEmptyString(jsonCredentials.private_key)) {
    // Ensure this value can never be logged.
    core.setSecret(jsonCredentials.private_key);

    const email =
      jsonCredentials.client_email ?? jsonCredentials.email ?? undefined;
    if (!isNonEmptyString(email)) {
      throw new Error(
        'Invalid service-account-key: missing required field "client_email" or "email"',
      );
    }
    return {
      type: authType.jsonKey,
      email,
    };
  }
  if (isNonEmptyString(jsonCredentials.workload_identity_provider)) {
    if (!isNonEmptyString(jsonCredentials.email)) {
      throw new Error(
        'Invalid service-account-key: missing required field "email"',
      );
    }
    return {
      type: authType.widFederation,
      email: jsonCredentials.email,
    };
  }

  throw new Error(
    'Invalid service-account-key: expected either "private_key" (json key) or "workload_identity_provider" (wid federation)',
  );
}

function isCurrentAccount(auth, current) {
  if (current) {
    return (
      current.type === auth.type &&
      current.email === auth.email &&
      current.projectId === auth.projectId
    );
  }
  return false;
}

const setEnvironmentVariable = (key, value, exportVariable) => {
  if (isNonEmptyString(value)) {
    if (exportVariable) {
      core.debug(`Export ${key}`);
      core.exportVariable(key, value);
    }
    process.env[key] = value;
  } else {
    if (exportVariable) {
      core.debug(`Unset ${key}`);
      core.exportVariable(key, '');
    }
    delete process.env[key];
  }
};

const populateEnvironment = ({
  projectId,
  credentialsFilePath,
  exportCredentials,
}) => {
  setEnvironmentVariable(env.projectId, projectId, exportCredentials);
  setEnvironmentVariable(
    env.applicationCredentials,
    credentialsFilePath,
    exportCredentials,
  );
  setEnvironmentVariable(
    env.credentialsOverride,
    credentialsFilePath,
    exportCredentials,
  );
};

export function getServiceAccountEmailAndProject(credentials) {
  // Ensure this never logs.
  core.setSecret(credentials);

  const jsonCredentials = parseCredentials(credentials);
  const { project_id: projectId } = jsonCredentials;
  const { email } = validateCredentialsShape(jsonCredentials);

  return { email, projectId };
}

/**
 * Authenticate gcloud with provided credentials. Two types of credentials are supported:
 * 1) A service account in JSON format (legacy)
 * 2) workload identity federation (preferred)
 *
 * @param credentials the credentials to use
 * @param exportCredentials flag indicating if credentials should be exported to environment
 */
export async function authenticateGcloud(credentials, exportCredentials) {
  // Ensure this never logs.
  core.setSecret(credentials);

  const jsonCredentials = parseCredentials(credentials);
  const { type, email } = validateCredentialsShape(jsonCredentials);

  const { project_id: projectId } = jsonCredentials;

  const authEntry = {
    type,
    email,
    projectId,
    exportCredentials,
    credentialsFilePath: '',
    refreshTokenMetadata: undefined,
  };

  const current = getCurrentAccount();

  if (isCurrentAccount(authEntry, current)) {
    // Already logged in. Refresh the GitHub ID token used by WIF.
    await current.refreshToken();
  } else {
    // Create a job-scoped credential file (handles base64 decoding and cleanup tracking)
    authEntry.credentialsFilePath = createJobScopedCredential(credentials);

    core.info(
      `Authenticate gcloud account '${authEntry.email}' with ${authEntry.type}`,
    );

    try {
      // Ensure projectId is set before executing any gcloud command
      process.env[env.projectId] = projectId;

      // Credentials must always be exported to env for overrides.
      authEntry.exportCredentials = true;

      if (authEntry.type === authType.widFederation) {
        authEntry.refreshTokenMetadata = await workloadIdentityFederation(
          authEntry.credentialsFilePath,
          jsonCredentials,
        );
      }
    } finally {
      delete process.env[env.projectId];
    }

    const authStack = loadAuthStack();
    authStack.push(authEntry);
    saveAuthStack(authStack);
    populateEnvironment(authEntry);
  }

  return projectId;
}

export function getCurrentAccount() {
  const authStack = loadAuthStack();
  const account = authStack.at(-1);
  if (!account) {
    return undefined;
  }

  const refreshToken = async () => {};
  if (
    account.type === authType.widFederation &&
    account.refreshTokenMetadata &&
    typeof account.refreshTokenMetadata === 'object'
  ) {
    return {
      ...account,
      refreshToken: async () => refreshIdToken(account.refreshTokenMetadata),
    };
  }

  return {
    ...account,
    refreshToken,
  };
}

/**
 * Reset all tracked gcloud authentications and clear auth-related environment variables.
 */
export function resetAuthStack() {
  const wasNonEmpty = loadAuthStack().length > 0;
  clearAuthStack();
  if (wasNonEmpty) {
    populateEnvironment({
      type: authType.jsonKey,
      projectId: '',
      credentialsFilePath: '',
      exportCredentials: true,
    });
  }
}

/**
 * Restore the previously authenticated account.
 * @param previousAccount the previously authenticated account as returned by {@link getCurrentAccount}.
 * @return {Promise<boolean>} a promise that completes with true if credentials was restored, false otherwise
 */
export async function restorePreviousAccount(previousAccount) {
  if (!previousAccount) {
    // No previous account.
    return false;
  }

  const authStack = loadAuthStack();

  // Pop the current account from the stack
  authStack.pop();

  core.info(`Restore gcloud account '${previousAccount.email}'`);

  // Push the previous account to top of stack.
  authStack.push(previousAccount);
  saveAuthStack(authStack);

  // Restore the environment variables.
  populateEnvironment(previousAccount);

  return true;
}
