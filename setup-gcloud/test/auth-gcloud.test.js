import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  authenticateGcloud,
  getCurrentAccount,
  resetAuthStack,
  restorePreviousAccount,
} from '../src/auth-gcloud.js';
import {
  authenticateJsonKey,
  configureServiceAccount,
} from '../src/auth-json-key.js';
import { workloadIdentityFederation } from '../src/auth-wid-federation.js';
import createJobScopedCredential from '../src/create-job-scoped-credential.js';

vi.mock('@actions/core');
vi.mock('../src/create-job-scoped-credential.js');
vi.mock('../src/auth-json-key.js');
vi.mock('../src/auth-wid-federation.js');

const encodeCredentials = (credentials) =>
  Buffer.from(JSON.stringify(credentials), 'utf8').toString('base64');

describe('auth-gcloud', () => {
  let orgEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    orgEnv = process.env;
    process.env = { ...orgEnv };
    resetAuthStack();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = orgEnv;
    resetAuthStack();
  });

  test('authenticates JSON service account credentials', async () => {
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/credential-key.json',
    );
    authenticateJsonKey.mockResolvedValueOnce(undefined);

    const projectId = await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key',
        client_email: 'json-sa@example.iam.gserviceaccount.com',
        project_id: 'project-a',
      }),
      false,
    );

    expect(projectId).toBe('project-a');
    expect(createJobScopedCredential).toHaveBeenCalledTimes(1);
    expect(authenticateJsonKey).toHaveBeenCalledWith(
      '/runner/temp/setup-gcloud-xxx/credential-key.json',
    );
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(core.exportVariable).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-a');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-key.json',
    );
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBeUndefined();
    expect(getCurrentAccount()).toMatchObject({
      type: 'json_key',
      email: 'json-sa@example.iam.gserviceaccount.com',
      projectId: 'project-a',
      credentialsFilePath: '/runner/temp/setup-gcloud-xxx/credential-key.json',
    });
  });

  test('authenticates workload identity federation and exports job-scoped credentials', async () => {
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
    workloadIdentityFederation.mockResolvedValueOnce(undefined);

    const credentials = {
      workload_identity_provider:
        'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
      email: 'wid-sa@example.iam.gserviceaccount.com',
      project_id: 'project-wid',
    };

    const projectId = await authenticateGcloud(
      encodeCredentials(credentials),
      true,
    );

    expect(projectId).toBe('project-wid');
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).toHaveBeenCalledWith(
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
      credentials,
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_CORE_PROJECT',
      'project-wid',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GOOGLE_APPLICATION_CREDENTIALS',
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-wid');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
  });

  test('skips re-authentication when account is already current', async () => {
    createJobScopedCredential.mockReturnValue(
      '/runner/temp/setup-gcloud-xxx/credential-key.json',
    );
    authenticateJsonKey.mockResolvedValue(undefined);

    const credentials = encodeCredentials({
      private_key: 'private-key',
      email: 'json-sa@example.iam.gserviceaccount.com',
      project_id: 'project-a',
    });

    await authenticateGcloud(credentials, false);
    await authenticateGcloud(credentials, false);

    expect(createJobScopedCredential).toHaveBeenCalledTimes(1);
    expect(authenticateJsonKey).toHaveBeenCalledTimes(1);
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
  });

  test('restorePreviousAccount restores prior JSON account', async () => {
    createJobScopedCredential
      .mockReturnValueOnce(
        '/runner/temp/setup-gcloud-xxx/credential-first.json',
      )
      .mockReturnValueOnce(
        '/runner/temp/setup-gcloud-xxx/credential-second.json',
      );
    authenticateJsonKey.mockResolvedValue(undefined);

    await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key-a',
        email: 'first@example.iam.gserviceaccount.com',
        project_id: 'project-first',
      }),
      false,
    );
    const previousAccount = getCurrentAccount();

    await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key-b',
        email: 'second@example.iam.gserviceaccount.com',
        project_id: 'project-second',
      }),
      false,
    );

    const result = await restorePreviousAccount(previousAccount);
    expect(result).toEqual(true);

    expect(configureServiceAccount).toHaveBeenCalledWith(
      'first@example.iam.gserviceaccount.com',
    );
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-first');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-first.json',
    );
  });

  test('restorePreviousAccount is no-op when previous account is current', async () => {
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/credential-current.json',
    );
    authenticateJsonKey.mockResolvedValueOnce(undefined);

    await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key',
        email: 'current@example.iam.gserviceaccount.com',
        project_id: 'project-current',
      }),
      false,
    );

    const currentAccount = getCurrentAccount();
    const result = await restorePreviousAccount(currentAccount);
    expect(result).toEqual(true);

    expect(configureServiceAccount).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-current');
  });

  test('resetAuthStack clears tracked account and auth environment variables', async () => {
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/credential-key.json',
    );
    authenticateJsonKey.mockResolvedValueOnce(undefined);

    await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key',
        email: 'json-sa@example.iam.gserviceaccount.com',
        project_id: 'project-a',
      }),
      true,
    );

    expect(getCurrentAccount()).toBeTruthy();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-a');

    resetAuthStack();

    expect(getCurrentAccount()).toBeUndefined();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBeUndefined();
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBeUndefined();
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_CORE_PROJECT',
      '',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GOOGLE_APPLICATION_CREDENTIALS',
      '',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
      '',
    );
  });

  test('rejects when decoded credentials are not valid JSON', async () => {
    await expect(
      authenticateGcloud(Buffer.from('not-json', 'utf8').toString('base64')),
    ).rejects.toThrow();

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('rejects when credentials are not base64 encoded JSON payload', async () => {
    await expect(authenticateGcloud('%%%')).rejects.toThrow();

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('rejects when required project_id is missing', async () => {
    await expect(
      authenticateGcloud(
        encodeCredentials({
          private_key: 'private-key',
          client_email: 'json-sa@example.iam.gserviceaccount.com',
        }),
        false,
      ),
    ).rejects.toThrow('missing required field "project_id"');

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('rejects json key credentials when client_email is missing', async () => {
    await expect(
      authenticateGcloud(
        encodeCredentials({
          private_key: 'private-key',
          project_id: 'project-a',
        }),
        false,
      ),
    ).rejects.toThrow('missing required field "client_email"');

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('rejects wid credentials when email is missing', async () => {
    await expect(
      authenticateGcloud(
        encodeCredentials({
          workload_identity_provider:
            'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
          project_id: 'project-a',
        }),
        false,
      ),
    ).rejects.toThrow('missing required field "email"');

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('rejects when neither private_key nor workload_identity_provider are present', async () => {
    await expect(
      authenticateGcloud(
        encodeCredentials({
          email: 'service-account@example.iam.gserviceaccount.com',
          project_id: 'project-a',
        }),
        false,
      ),
    ).rejects.toThrow('expected either "private_key"');

    expect(createJobScopedCredential).not.toHaveBeenCalled();
    expect(authenticateJsonKey).not.toHaveBeenCalled();
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(getCurrentAccount()).toBeUndefined();
  });

  test('does not mutate auth stack or environment when wid flow fails', async () => {
    createJobScopedCredential.mockReturnValueOnce(
      '/runner/temp/setup-gcloud-xxx/credential-wid.json',
    );
    workloadIdentityFederation.mockRejectedValueOnce(
      new Error('gcloud wid auth failed'),
    );

    await expect(
      authenticateGcloud(
        encodeCredentials({
          workload_identity_provider:
            'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
          email: 'wid-sa@example.iam.gserviceaccount.com',
          project_id: 'project-wid',
        }),
        true,
      ),
    ).rejects.toThrow('gcloud wid auth failed');

    expect(getCurrentAccount()).toBeUndefined();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBeUndefined();
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBeUndefined();
  });

  test('restorePreviousAccount is no-op when no previous account exists', async () => {
    process.env.CLOUDSDK_CORE_PROJECT = 'keep-project';
    const result = await restorePreviousAccount(undefined);
    expect(result).toEqual(false);

    expect(configureServiceAccount).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('keep-project');
  });

  test('restorePreviousAccount restores wid environment without configuring account', async () => {
    createJobScopedCredential
      .mockReturnValueOnce(
        '/runner/temp/setup-gcloud-xxx/credential-wid-first.json',
      )
      .mockReturnValueOnce(
        '/runner/temp/setup-gcloud-xxx/credential-json-second.json',
      );
    workloadIdentityFederation.mockResolvedValueOnce(undefined);
    authenticateJsonKey.mockResolvedValueOnce(undefined);

    await authenticateGcloud(
      encodeCredentials({
        workload_identity_provider:
          'projects/123/locations/global/workloadIdentityPools/pool/providers/provider',
        email: 'wid-sa@example.iam.gserviceaccount.com',
        project_id: 'project-wid',
      }),
      false,
    );
    const previousAccount = getCurrentAccount();

    await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key',
        email: 'json-sa@example.iam.gserviceaccount.com',
        project_id: 'project-json',
      }),
      false,
    );

    await restorePreviousAccount(previousAccount);

    expect(configureServiceAccount).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-wid');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-wid-first.json',
    );
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBe(
      '/runner/temp/setup-gcloud-xxx/credential-wid-first.json',
    );
  });
});
