import * as core from '@actions/core';
import createKeyFile from 'action-utils/src/create-key-file.js';

import {
  authenticateJsonKey,
  configureServiceAccount,
} from './auth-json-key.js';
import { workloadIdentityFederation } from './auth-wid-federation.js';
import copyCredentials from './copy-credentials.js';

// A stack with authorizations that has occurred throughout the action's lifetime.
// This allows us to push and pop authorizations from different sources.
const authStack = [];

const authType = {
  jsonKey: 'json_key',
  widFederation: 'wid_federation',
};

const env = {
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
        'Invalid service-account-key: missing required field "client_email"',
      );
    }
    return {
      type: authType.jsonKey,
      email,
    };
  }
  if (isNonEmptyString(jsonCredentials.identity_pool)) {
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
    'Invalid service-account-key: expected either "private_key" (json key) or "identity_pool" (wid federation)',
  );
}

function isCurrentAccount(auth) {
  const current = getCurrentAccount();
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
      core.info(`Export ${key}`);
      core.exportVariable(key, value);
    }
    process.env[key] = value;
  } else {
    if (exportVariable) {
      core.info(`Unset ${key}`);
      core.exportVariable(key, '');
    }
    delete process.env[key];
  }
};

const populateEnvironment = ({
  type,
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
  if (type === authType.widFederation) {
    setEnvironmentVariable(
      env.credentialsOverride,
      credentialsFilePath,
      exportCredentials,
    );
  } else {
    setEnvironmentVariable(env.credentialsOverride, '', exportCredentials);
  }
};

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
  };

  if (!isCurrentAccount(authEntry)) {
    const tmpKeyFile = createKeyFile(credentials);

    authEntry.credentialsFilePath = tmpKeyFile;

    core.info(`Authenticate gcloud with ${authEntry.type}`);

    if (authEntry.type === authType.jsonKey) {
      await authenticateJsonKey(tmpKeyFile);
    } else {
      await workloadIdentityFederation(tmpKeyFile, jsonCredentials);
    }

    if (exportCredentials) {
      authEntry.credentialsFilePath = await copyCredentials(tmpKeyFile);
    }

    authStack.push(authEntry);
    populateEnvironment(authEntry);
  }

  return projectId;
}

export function getCurrentAccount() {
  return authStack.at(authStack.length - 1);
}

/**
 * Reset all tracked gcloud authentications and clear auth-related environment variables.
 */
export function resetAuthStack() {
  authStack.length = 0;
  populateEnvironment({
    type: authType.jsonKey,
    projectId: '',
    credentialsFilePath: '',
    exportCredentials: true,
  });
}

/**
 * Restore the previously authenticated account.
 * @param previousAccount the previously authenticated account as returned by {@link getCurrentAccount}.
 */
export async function restorePreviousAccount(previousAccount) {
  if (!previousAccount) {
    // No previous account. Should we forget the current account? For now, we will leave it as is for backwards compatibility.
    return;
  }

  const current = authStack.pop();
  if (current === previousAccount) {
    // Same account, push it and return. State is already matching.
    authStack.push(previousAccount);
    return;
  }

  core.info(`Restore gcloud account ${previousAccount.email}`);

  if (previousAccount.type === authType.jsonKey) {
    await configureServiceAccount(previousAccount.email);
  }

  // Restore the environment variables.
  populateEnvironment(previousAccount);
}
