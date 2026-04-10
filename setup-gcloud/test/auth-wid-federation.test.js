import fs from 'node:fs';

import * as core from '@actions/core';
import { describe, expect, test, vi } from 'vitest';

import {
  refreshIdToken,
  workloadIdentityFederation,
} from '../src/auth-wid-federation.js';
import createJobScopedCredential from '../src/create-job-scoped-credential.js';
import { execGcloud } from '../src/exec-gcloud.js';

vi.mock('@actions/core');
vi.mock('../src/exec-gcloud.js');
vi.mock('../src/create-job-scoped-credential.js');
vi.mock('node:fs', () => ({
  default: {
    writeFileSync: vi.fn(),
  },
}));

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
        workload_identity_provider:
          'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        email: 'service-account@example.iam.gserviceaccount.com',
      },
    );

    expect(core.getIDToken).toHaveBeenCalledWith(
      'https://iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
    );
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

  test('returns refresh metadata used to refresh OIDC token', async () => {
    core.getIDToken
      .mockResolvedValueOnce('oidc-token-initial')
      .mockResolvedValueOnce('oidc-token-refreshed');
    createJobScopedCredential.mockReturnValueOnce('/runner/temp/id-token.txt');
    execGcloud.mockResolvedValueOnce('');

    const refreshTokenMetadata = await workloadIdentityFederation(
      '/runner/temp/wid-config.json',
      {
        workload_identity_provider:
          'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        email: 'service-account@example.iam.gserviceaccount.com',
      },
    );

    expect(refreshTokenMetadata).toEqual({
      workloadIdentityProvider:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      idTokenPath: '/runner/temp/id-token.txt',
    });

    await refreshIdToken(refreshTokenMetadata);

    expect(core.getIDToken).toHaveBeenNthCalledWith(
      2,
      'https://iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
    );
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/runner/temp/id-token.txt',
      'oidc-token-refreshed',
      {
        encoding: 'utf8',
        mode: 0o600,
      },
    );
  });
});
