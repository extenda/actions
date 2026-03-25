import fs from 'node:fs';

import * as core from '@actions/core';

import { getJobScope } from './job-scope.js';

/**
 * Delete tracked credential files.
 *
 * @param {string[]} credentialFiles - array of file paths to delete
 */
export function deleteCredentialFiles(credentialFiles) {
  for (const filePath of credentialFiles) {
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath);
        core.debug(`Deleted credential file: ${filePath}`);
      }
    } catch (err) {
      core.warning(
        `Failed to delete credential file ${filePath}: ${err.message}`,
      );
    }
  }
}

/**
 * Delete job-scoped credential directory.
 */
export function deleteJobScopedDirectory() {
  try {
    const jobScopedDir = getJobScope();
    if (fs.existsSync(jobScopedDir)) {
      fs.rmSync(jobScopedDir, { recursive: true });
      core.debug(`Deleted job-scoped credential directory: ${jobScopedDir}`);
    }
  } catch (err) {
    core.warning(`Failed to delete job-scoped directory: ${err.message}`);
  }
}

/**
 * Delete isolated gcloud config directory.
 */
export function deleteGcloudConfigDirectory() {
  try {
    const cloudSdkConfigPath = process.env.CLOUDSDK_CONFIG;
    if (cloudSdkConfigPath && fs.existsSync(cloudSdkConfigPath)) {
      fs.rmSync(cloudSdkConfigPath, { recursive: true });
      core.debug(`Deleted CLOUDSDK_CONFIG directory: ${cloudSdkConfigPath}`);
    }
  } catch (err) {
    core.warning(`Failed to delete CLOUDSDK_CONFIG directory: ${err.message}`);
  }
}

export function getCredentialFilesFromState() {
  const credentialFilesState = core.getState('gcloud-credential-files');
  if (credentialFilesState) {
    return JSON.parse(credentialFilesState);
  }
  return [];
}

/**
 * Perform all cleanup operations.
 * Called by post-step and optionally by withGcloud.
 * @param {string[]} credentialFiles the credential files
 */
export function cleanupCredentials(credentialFiles) {
  core.info('Clean up gcloud credentials');

  deleteCredentialFiles(credentialFiles || []);

  // Clean up job-scoped directory
  deleteJobScopedDirectory();

  // Clean up gcloud config directory
  deleteGcloudConfigDirectory();
}
