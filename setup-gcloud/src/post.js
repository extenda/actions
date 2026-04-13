import { run } from 'action-utils';

import { resetAuthStack } from './auth-gcloud.js';
import { cleanupCredentials, getCredentialFilesFromState } from './cleanup.js';
/**
 * Post-step cleanup for setup-gcloud action.
 * Runs at the end of the job to delete all credential files and directories.
 */
const postAction = async () => {
  const credentialFiles = getCredentialFilesFromState();
  cleanupCredentials(credentialFiles);

  // Reset auth stack to clear environment variables such as access tokens
  await resetAuthStack();
};

run(postAction);
