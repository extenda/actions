import * as core from '@actions/core';

import createJobScopedCredential from './create-job-scoped-credential.js';
import { execGcloud } from './exec-gcloud.js';

export async function workloadIdentityFederation(
  credentialsFilePath,
  { workload_identity_provider: workloadIdentityProvider, email },
) {
  const idToken = await core.getIDToken(
    `https://iam.googleapis.com/${workloadIdentityProvider}`,
  );
  // Create a job-scoped file for the OIDC token
  const idTokenPath = createJobScopedCredential(idToken, { encoding: 'utf8' });

  await execGcloud(
    [
      'iam',
      'workload-identity-pools',
      'create-cred-config',
      workloadIdentityProvider,
      `--service-account=${email}`,
      `--output-file=${credentialsFilePath}`,
      `--credential-source-file=${idTokenPath}`,
    ],
    'gcloud',
    true,
  );
}
