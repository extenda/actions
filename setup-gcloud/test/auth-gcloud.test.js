import * as core from '@actions/core';
import createKeyFile from 'action-utils/src/create-key-file.js';
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
import copyCredentials from '../src/copy-credentials.js';

vi.mock('@actions/core');
vi.mock('action-utils/src/create-key-file.js');
vi.mock('../src/auth-json-key.js');
vi.mock('../src/auth-wid-federation.js');
vi.mock('../src/copy-credentials.js');

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
    createKeyFile.mockReturnValueOnce('/tmp/key.json');
    authenticateJsonKey.mockResolvedValueOnce(undefined);

    const projectId = await authenticateGcloud(
      encodeCredentials({
        private_key: 'private-key',
        email: 'json-sa@example.iam.gserviceaccount.com',
        project_id: 'project-a',
      }),
      false,
    );

    expect(projectId).toBe('project-a');
    expect(createKeyFile).toHaveBeenCalledTimes(1);
    expect(authenticateJsonKey).toHaveBeenCalledWith('/tmp/key.json');
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
    expect(core.exportVariable).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-a');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/tmp/key.json');
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBeUndefined();
    expect(getCurrentAccount()).toMatchObject({
      type: 'json_key',
      email: 'json-sa@example.iam.gserviceaccount.com',
      projectId: 'project-a',
      credentialsFilePath: '/tmp/key.json',
    });
  });

  test('authenticates workload identity federation and exports copied credentials', async () => {
    createKeyFile.mockReturnValueOnce('/tmp/wid.json');
    workloadIdentityFederation.mockResolvedValueOnce(undefined);
    copyCredentials.mockResolvedValueOnce('/runner/temp/copied-creds.json');

    const credentials = {
      identity_pool:
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
      '/tmp/wid.json',
      credentials,
    );
    expect(copyCredentials).toHaveBeenCalledWith('/tmp/wid.json');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_CORE_PROJECT',
      'project-wid',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GOOGLE_APPLICATION_CREDENTIALS',
      '/runner/temp/copied-creds.json',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE',
      '/runner/temp/copied-creds.json',
    );
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-wid');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe(
      '/runner/temp/copied-creds.json',
    );
    expect(process.env.CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE).toBe(
      '/runner/temp/copied-creds.json',
    );
  });

  test('skips re-authentication when account is already current', async () => {
    createKeyFile.mockReturnValue('/tmp/key.json');
    authenticateJsonKey.mockResolvedValue(undefined);

    const credentials = encodeCredentials({
      private_key: 'private-key',
      email: 'json-sa@example.iam.gserviceaccount.com',
      project_id: 'project-a',
    });

    await authenticateGcloud(credentials, false);
    await authenticateGcloud(credentials, false);

    expect(createKeyFile).toHaveBeenCalledTimes(1);
    expect(authenticateJsonKey).toHaveBeenCalledTimes(1);
    expect(workloadIdentityFederation).not.toHaveBeenCalled();
  });

  test('restorePreviousAccount restores prior JSON account', async () => {
    createKeyFile
      .mockReturnValueOnce('/tmp/first.json')
      .mockReturnValueOnce('/tmp/second.json');
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

    await restorePreviousAccount(previousAccount);

    expect(configureServiceAccount).toHaveBeenCalledWith(
      'first@example.iam.gserviceaccount.com',
    );
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-first');
    expect(process.env.GOOGLE_APPLICATION_CREDENTIALS).toBe('/tmp/first.json');
  });

  test('restorePreviousAccount is no-op when previous account is current', async () => {
    createKeyFile.mockReturnValueOnce('/tmp/current.json');
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
    await restorePreviousAccount(currentAccount);

    expect(configureServiceAccount).not.toHaveBeenCalled();
    expect(process.env.CLOUDSDK_CORE_PROJECT).toBe('project-current');
  });

  test('resetAuthStack clears tracked account and auth environment variables', async () => {
    createKeyFile.mockReturnValueOnce('/tmp/key.json');
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
});
