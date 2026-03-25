import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import { v4 as uuid } from 'uuid';

import { getJobScope } from './job-scope.js';

// In-memory tracking of credential files created during this action execution.
// We update state after each file creation.
const trackedCredentialFiles = [];

/**
 * Create a job-scoped credential file with state tracking for cleanup.
 * The file is placed outside the working directory and tracked for post-step deletion.
 *
 * @param {string} credentialData - base64-encoded credential data (or raw data if encoding is 'utf8')
 * @param {Object} options - configuration object
 * @param {string} [options.encoding='base64'] - encoding of credentialData ('base64' or 'utf8')
 * @param {string} [options.suffix='.json'] - file suffix (e.g. '.json')
 * @returns {string} the path to the created credential file
 */
export default function createJobScopedCredential(
  credentialData,
  { encoding = 'base64', suffix = '.json' } = {},
) {
  // Get job-scoped directory
  const jobScopedDir = getJobScope();

  if (!fs.existsSync(jobScopedDir)) {
    fs.mkdirSync(jobScopedDir, { recursive: true });
  }

  // Create credential file with unique name
  const credentialFilePath = path.join(
    jobScopedDir,
    `credential-${uuid()}${suffix}`,
  );

  // Decode credential data
  const decodedData =
    encoding === 'base64'
      ? Buffer.from(credentialData, 'base64').toString('utf8')
      : credentialData;

  // Write file with restrictive permissions (owner read/write only)
  fs.writeFileSync(credentialFilePath, decodedData, {
    mode: 0o600, // rw-------
  });

  // Mask the file path so it doesn't leak in logs
  core.setSecret(credentialFilePath);

  // Track this file in-memory and persist to state for post-step
  trackedCredentialFiles.push(credentialFilePath);
  core.saveState(
    'gcloud-credential-files',
    JSON.stringify(trackedCredentialFiles),
  );

  return credentialFilePath;
}

export function getTrackedCredentials() {
  return trackedCredentialFiles;
}

/**
 * Reset tracked credentials. Used for testing only.
 * @internal
 */
export function resetTrackedCredentials() {
  trackedCredentialFiles.length = 0;
}
