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
  if (typeof value === 'string' && value.length > 0) {
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
  const jsonCredentials = JSON.parse(
    Buffer.from(credentials, 'base64').toString('utf8'),
  );

  const { email, project_id: projectId } = jsonCredentials;

  const authEntry = {
    type:
      'private_key' in jsonCredentials
        ? authType.jsonKey
        : authType.widFederation,
    email,
    projectId,
    exportCredentials,
    credentialsFilePath: '',
  };

  if (!isCurrentAccount(authEntry)) {
    const tmpKeyFile = createKeyFile(credentials);
    authEntry.credentialsFilePath = tmpKeyFile;

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
