import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getCurrentAccount,
  restorePreviousAccount,
} from '../src/auth-gcloud.js';
import setupGcloud from '../src/setup-gcloud.js';
import withGcloud from '../src/with-gcloud.js';

vi.mock('../src/setup-gcloud.js');
vi.mock('../src/auth-gcloud.js');

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
    restorePreviousAccount.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can run without existing gcloud installation', async () => {
    const callback = vi.fn().mockResolvedValue('callback-result');

    const result = await withGcloud('json-key', callback);

    expect(result).toEqual('callback-result');
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
  });

  test('It restores previous account even when callback throws', async () => {
    const callback = vi.fn().mockRejectedValue(new Error('boom'));

    await expect(withGcloud('json-key', callback)).rejects.toThrow('boom');

    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(restorePreviousAccount).toHaveBeenCalledWith(previousAccount);
  });
});
