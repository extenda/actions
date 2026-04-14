import { cleanupCredentials, getCredentialFilesFromState } from './cleanup.js';

/**
 * Post-step cleanup for setup-gcloud action.
 * Runs at the end of the job to delete all credential files and directories.
 */
const postAction = () => {
  const credentialFiles = getCredentialFilesFromState();
  cleanupCredentials(credentialFiles);
};

postAction();
