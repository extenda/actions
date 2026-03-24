import * as core from '@actions/core';
import { describe, expect, test, vi } from 'vitest';

import createKeyFile from '../../utils/src/create-key-file.js';
import { workloadIdentityFederation } from '../src/auth-wid-federation.js';
import { execGcloud } from '../src/exec-gcloud.js';

vi.mock('@actions/core');
vi.mock('../src/exec-gcloud.js');
vi.mock('../../utils/src/create-key-file.js');

describe('auth-wid-federation', () => {
  test('creates federation credential config from GitHub OIDC token', async () => {
    core.getIDToken.mockResolvedValueOnce('oidc-token');
    createKeyFile.mockReturnValueOnce('/tmp/id-token.json');
    execGcloud.mockResolvedValueOnce('');

    await workloadIdentityFederation('/tmp/wid-config.json', {
      identity_pool:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      email: 'service-account@example.iam.gserviceaccount.com',
    });

    expect(core.getIDToken).toHaveBeenCalledWith('https://iam.googleapis.com/');
    expect(createKeyFile).toHaveBeenCalledWith('oidc-token', {
      encoding: 'utf8',
    });
    expect(execGcloud).toHaveBeenCalledWith(
      [
        'iam',
        'workload-identity-pools',
        'create-cred-config',
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        '--service-account=service-account@example.iam.gserviceaccount.com',
        '--output-file=/tmp/wid-config.json',
        '--credential-source-file=/tmp/id-token.json',
      ],
      'gcloud',
      false,
    );
  });
});
