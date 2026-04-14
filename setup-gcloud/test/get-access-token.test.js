import * as core from '@actions/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getCurrentAccount } from '../src/auth-gcloud.js';
import { execGcloud } from '../src/exec-gcloud.js';
import { getAccessToken } from '../src/get-access-token.js';

vi.mock('@actions/core');
vi.mock('../src/exec-gcloud.js');
vi.mock('../src/auth-gcloud.js');

beforeEach(() => {
  vi.resetAllMocks();
});

test('returns access token for JSON key type', async () => {
  execGcloud.mockResolvedValue('access-token-123');
  getCurrentAccount.mockReturnValue({
    type: 'json_key',
    email: 'json-sa@example.iam.gserviceaccount.com',
  });

  const token = await getAccessToken();

  expect(token).toBe('access-token-123');
  expect(execGcloud).toHaveBeenCalledWith(
    ['auth', 'print-access-token'],
    'gcloud',
    true,
  );
  expect(core.setSecret).toHaveBeenCalledWith('access-token-123');
});

test('returns access token for WIF type with impersonation flag', async () => {
  execGcloud.mockResolvedValue('access-token-456');
  getCurrentAccount.mockReturnValue({
    type: 'wid_federation',
    email: 'wid-sa@example.iam.gserviceaccount.com',
  });

  const token = await getAccessToken();

  expect(token).toBe('access-token-456');
  expect(execGcloud).toHaveBeenCalledWith(
    [
      'auth',
      'print-access-token',
      '--impersonate-service-account=wid-sa@example.iam.gserviceaccount.com',
    ],
    'gcloud',
    true,
  );
  expect(core.setSecret).toHaveBeenCalledWith('access-token-456');
});

test('masks the access token as a secret', async () => {
  execGcloud.mockResolvedValue('secret-token');
  getCurrentAccount.mockReturnValue({
    type: 'json_key',
    email: 'json-sa@example.iam.gserviceaccount.com',
  });

  await getAccessToken();

  expect(core.setSecret).toHaveBeenCalledTimes(1);
  expect(core.setSecret).toHaveBeenCalledWith('secret-token');
});

test('returns null when no account is authenticated', async () => {
  getCurrentAccount.mockReturnValue(undefined);

  await expect(getAccessToken()).resolves.toBeNull();

  expect(execGcloud).not.toHaveBeenCalled();
  expect(core.setSecret).not.toHaveBeenCalled();
});

test('returns null and logs a warning when execGcloud fails', async () => {
  getCurrentAccount.mockReturnValue({
    type: 'json_key',
    email: 'json-sa@example.iam.gserviceaccount.com',
  });
  execGcloud.mockRejectedValue(new Error('permission denied'));

  await expect(getAccessToken()).resolves.toBeNull();

  expect(core.warning).toHaveBeenCalledWith(
    expect.stringContaining('Missing permissions'),
  );
  expect(core.debug).toHaveBeenCalledWith('permission denied');
  expect(core.setSecret).not.toHaveBeenCalled();
});

describe('debug mode', () => {
  test('logs token info when core.isDebug() is true', async () => {
    execGcloud.mockResolvedValue('debug-token');
    core.isDebug.mockReturnValue(true);
    getCurrentAccount.mockReturnValue({
      type: 'json_key',
      email: 'json-sa@example.iam.gserviceaccount.com',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      json: () => Promise.resolve({ expires_in: 3600, email: 'json-sa@example.iam.gserviceaccount.com' }),
    });

    const token = await getAccessToken();

    expect(token).toBe('debug-token');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/tokeninfo',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(core.debug).toHaveBeenCalledWith(
      expect.stringContaining('expires_in'),
    );
  });

  test('does not propagate errors from tokeninfo fetch in debug mode', async () => {
    execGcloud.mockResolvedValue('debug-token');
    core.isDebug.mockReturnValue(true);
    getCurrentAccount.mockReturnValue({
      type: 'json_key',
      email: 'json-sa@example.iam.gserviceaccount.com',
    });

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
      new Error('network failure'),
    );

    await expect(getAccessToken()).resolves.toBe('debug-token');
    expect(core.error).toHaveBeenCalledWith(
      expect.stringContaining('network failure'),
    );
  });

  test('does not call tokeninfo when core.isDebug() is false', async () => {
    execGcloud.mockResolvedValue('token');
    core.isDebug.mockReturnValue(false);
    getCurrentAccount.mockReturnValue({
      type: 'json_key',
      email: 'json-sa@example.iam.gserviceaccount.com',
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await getAccessToken();

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
