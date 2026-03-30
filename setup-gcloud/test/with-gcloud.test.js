import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getCurrentAccount,
  getServiceAccountEmailAndProject,
  resetAuthStack,
  restorePreviousAccount,
} from '../src/auth-gcloud.js';
import { cleanupCredentials } from '../src/cleanup.js';
import { getTrackedCredentials } from '../src/create-job-scoped-credential.js';
import setupGcloud from '../src/setup-gcloud.js';
import withGcloud from '../src/with-gcloud.js';

vi.mock('../src/setup-gcloud.js');
vi.mock('../src/auth-gcloud.js');
vi.mock('../src/cleanup.js');
vi.mock('../src/create-job-scoped-credential.js');

describe('With Gcloud', () => {
  const previousAccount = {
    type: 'json_key',
    email: 'previous@example.iam.gserviceaccount.com',
    projectId: 'project-a',
    credentialsFilePath: '/tmp/previous.json',
  };

  beforeEach(() => {
    getCurrentAccount.mockReturnValue(previousAccount);
    getServiceAccountEmailAndProject.mockReturnValue({
      email: 'new@example.iam.gserviceaccount.com',
      projectId: 'new-project',
    });
    setupGcloud.mockResolvedValue('test-project');
    restorePreviousAccount.mockResolvedValue(true);
    getTrackedCredentials.mockReturnValue(['/tmp/new-cred.json']);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('runs callback and restores previous account', async () => {
    const callback = vi.fn().mockResolvedValue('callback-result');

    const result = await withGcloud('json-key', callback);

    expect(result).toEqual('callback-result');
    expect(getServiceAccountEmailAndProject).toHaveBeenCalledWith('json-key');
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
    expect(cleanupCredentials).not.toHaveBeenCalled();
    expect(getTrackedCredentials).not.toHaveBeenCalled();
  });

  test('restores previous account even when callback throws', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withGcloud('json-key', callback)).rejects.toThrow('boom');

    expect(getServiceAccountEmailAndProject).toHaveBeenCalledWith('json-key');
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
  });

  test('reuses existing auth when parsed account matches current account', async () => {
    getServiceAccountEmailAndProject.mockReturnValue({
      email: previousAccount.email,
      projectId: 'project-a',
    });
    const callback = vi.fn().mockResolvedValue('callback-result');

    const result = await withGcloud('json-key', callback);

    expect(result).toEqual('callback-result');
    expect(getServiceAccountEmailAndProject).toHaveBeenCalledWith('json-key');
    expect(setupGcloud).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith('project-a');
    expect(restorePreviousAccount).not.toHaveBeenCalled();
    expect(cleanupCredentials).not.toHaveBeenCalled();
    expect(resetAuthStack).not.toHaveBeenCalled();
  });

  test('reuses persisted auth-stack entry when current account matches service account', async () => {
    getCurrentAccount.mockReturnValue({
      type: 'wid_federation',
      email: 'persisted@example.iam.gserviceaccount.com',
      projectId: 'persisted-project',
      exportCredentials: true,
      credentialsFilePath: '/tmp/setup-gcloud-123/auth_wid_1.json',
    });
    getServiceAccountEmailAndProject.mockReturnValue({
      email: 'persisted@example.iam.gserviceaccount.com',
      projectId: 'persisted-project',
    });
    const callback = vi.fn().mockResolvedValue('callback-result');

    const result = await withGcloud('json-key', callback);

    expect(result).toEqual('callback-result');
    expect(setupGcloud).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith('persisted-project');
    expect(restorePreviousAccount).not.toHaveBeenCalled();
    expect(getTrackedCredentials).not.toHaveBeenCalled();
    expect(cleanupCredentials).not.toHaveBeenCalled();
    expect(resetAuthStack).not.toHaveBeenCalled();
  });

  test('falls back to setup when parsed projectId is null', async () => {
    getServiceAccountEmailAndProject.mockReturnValue({
      email: previousAccount.email,
      projectId: null,
    });
    const callback = vi.fn().mockResolvedValue('callback-result');

    await withGcloud('json-key', callback);

    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
  });

  test('throws when credential parsing fails and does not restore', async () => {
    getServiceAccountEmailAndProject.mockImplementation(() => {
      throw new Error('invalid credentials');
    });
    const callback = vi.fn();

    await expect(withGcloud('json-key', callback)).rejects.toThrow(
      'invalid credentials',
    );

    expect(setupGcloud).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    expect(restorePreviousAccount).not.toHaveBeenCalled();
  });

  test('falls back to setup when there is no previous account', async () => {
    getCurrentAccount.mockReturnValue(undefined);
    const callback = vi.fn().mockResolvedValue('cb');

    const result = await withGcloud('json-key', callback);

    expect(result).toEqual('cb');
    expect(getServiceAccountEmailAndProject).toHaveBeenCalledWith('json-key');
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(undefined);
  });

  test('cleans up tracked credentials when restorePreviousAccount returns false', async () => {
    restorePreviousAccount.mockResolvedValue(false);
    const callback = vi.fn().mockResolvedValue('callback-result');

    await withGcloud('json-key', callback);

    expect(getTrackedCredentials).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith(['/tmp/new-cred.json']);
  });

  test('cleans up tracked credentials when there is no previous account', async () => {
    getCurrentAccount.mockReturnValue(undefined);
    restorePreviousAccount.mockResolvedValue(false);
    const callback = vi.fn().mockResolvedValue('callback-result');

    await withGcloud('json-key', callback);

    expect(restorePreviousAccount).toHaveBeenCalledWith(undefined);
    expect(getTrackedCredentials).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith(['/tmp/new-cred.json']);
  });
});
