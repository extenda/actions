import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getCurrentAccount,
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
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
    expect(cleanupCredentials).not.toHaveBeenCalled();
    expect(getTrackedCredentials).not.toHaveBeenCalled();
  });

  test('restores previous account even when callback throws', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withGcloud('json-key', callback)).rejects.toThrow('boom');

    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
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
