import * as core from '@actions/core';

import createKeyFile from '../../utils/src/create-key-file.js';
import { execGcloud } from './exec-gcloud.js';

export async function workloadIdentityFederation(
  tmpKeyFile,
  { identity_pool: workloadIdentityPool, email },
) {
  const idToken = await core.getIDToken('https://iam.googleapis.com/');
  const idTokenPath = createKeyFile(idToken, { encoding: 'utf8' });

  await execGcloud(
    [
      'iam',
      'workload-identity-pools',
      'create-cred-config',
      workloadIdentityPool,
      `--service-account=${email}`,
      `--output-file=${tmpKeyFile}`,
      `--credential-source-file=${idTokenPath}`,
    ],
    'gcloud',
    false,
  );
}
