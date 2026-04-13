import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { authenticateGcloud, resetAuthStack } from '../src/auth-gcloud.js';
import {
  refreshIdToken,
  workloadIdentityFederation,
} from '../src/auth-wid-federation.js';
import createJobScopedCredential from '../src/create-job-scoped-credential.js';
import { execGcloud } from '../src/exec-gcloud.js';

vi.mock('@actions/core');
vi.mock('../src/create-job-scoped-credential.js');
vi.mock('../src/auth-wid-federation.js');
vi.mock('../src/exec-gcloud.js');

vi.mock('../src/auth-stack.js', () => {
  let authStack = [];

  return {
    clearAuthStack: () => {
      authStack = [];
    },
    loadAuthStack: () => authStack,
    saveAuthStack: (nextAuthStack) => {
      authStack = [...nextAuthStack];
    },
  };
});

const encodeCredentials = (credentials) =>
  Buffer.from(JSON.stringify(credentials), 'utf8').toString('base64');

describe('auth-gcloud refresh token', () => {
  beforeEach(async () => {
    process.env.CLOUDSDK_CORE_PROJECT = undefined;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = undefined;
    process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE = undefined;
    await resetAuthStack();
    execGcloud.mockResolvedValue('token-123');
  });

  afterEach(async () => {
    await resetAuthStack();
    vi.clearAllMocks();
  });

  test('refreshes WIF token when account is already current', async () => {
    createJobScopedCredential.mockReturnValue('/runner/temp/wid-config.json');
    workloadIdentityFederation.mockResolvedValue({
      workloadIdentityProvider:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      idTokenPath: '/runner/temp/id-token.txt',
    });
    refreshIdToken.mockResolvedValue(undefined);

    const credentials = encodeCredentials({
      workload_identity_provider:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      email: 'wid-sa@example.iam.gserviceaccount.com',
      project_id: 'project-wid',
    });

    await authenticateGcloud(credentials, true);
    await authenticateGcloud(credentials, true);

    expect(workloadIdentityFederation).toHaveBeenCalledTimes(1);
    expect(createJobScopedCredential).toHaveBeenCalledTimes(1);
    expect(refreshIdToken).toHaveBeenCalledTimes(1);
    expect(refreshIdToken).toHaveBeenCalledWith({
      workloadIdentityProvider:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      idTokenPath: '/runner/temp/id-token.txt',
    });
  });
});
