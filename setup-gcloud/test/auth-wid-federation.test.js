import * as core from '@actions/core';
import { describe, expect, test, vi } from 'vitest';

import { workloadIdentityFederation } from '../src/auth-wid-federation.js';
import createJobScopedCredential from '../src/create-job-scoped-credential.js';
import { execGcloud } from '../src/exec-gcloud.js';

vi.mock('@actions/core');
vi.mock('../src/exec-gcloud.js');
vi.mock('../src/create-job-scoped-credential.js');

describe('auth-wid-federation', () => {
  test('creates federation credential config from GitHub OIDC token', async () => {
    core.getIDToken.mockResolvedValueOnce('oidc-token');
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/id-token.json',
    );
    execGcloud.mockResolvedValueOnce('');

    await workloadIdentityFederation(
      '/runner/temp/setup-gcloud-xxx/wid-config.json',
      {
        identity_pool:
          'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        email: 'service-account@example.iam.gserviceaccount.com',
      },
    );

    expect(core.getIDToken).toHaveBeenCalledWith('https://iam.googleapis.com/');
    expect(createJobScopedCredential).toHaveBeenCalledWith('oidc-token', {
      encoding: 'utf8',
    });
    expect(execGcloud).toHaveBeenCalledWith(
      [
        'iam',
        'workload-identity-pools',
        'create-cred-config',
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        '--service-account=service-account@example.iam.gserviceaccount.com',
        '--output-file=/runner/temp/setup-gcloud-xxx/wid-config.json',
        '--credential-source-file=/runner/temp/setup-gcloud-xxx/id-token.json',
      ],
      'gcloud',
      true,
    );
  });
});
