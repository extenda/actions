import * as core from '@actions/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getAccessToken } from '../src/get-access-token.js';
import { action } from '../src/index.js';
import setupGcloud from '../src/setup-gcloud.js';

vi.mock('../src/setup-gcloud.js');
vi.mock('../src/get-access-token.js');
vi.mock('@actions/core');

describe('setup-gcloud action', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAccessToken.mockResolvedValue(null);
  });

  test('It can install latest', async () => {
    core.getInput.mockReturnValueOnce('key').mockReturnValue('');
    await action();
    expect(setupGcloud).toHaveBeenCalledWith('key', 'latest', false);
  });

  test('It can install specified version', async () => {
    core.getInput
      .mockReturnValueOnce('key')
      .mockReturnValueOnce('300.0.0')
      .mockReturnValue('');
    await action();
    expect(setupGcloud).toHaveBeenCalledWith('key', '300.0.0', false);
  });

  test('exports CLOUDSDK_AUTH_ACCESS_TOKEN when getAccessToken returns a token', async () => {
    core.getInput.mockReturnValueOnce('key').mockReturnValue('');
    getAccessToken.mockResolvedValue('my-access-token');

    await action();

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_AUTH_ACCESS_TOKEN',
      'my-access-token',
    );
  });

  test('does not export CLOUDSDK_AUTH_ACCESS_TOKEN when getAccessToken returns null', async () => {
    core.getInput.mockReturnValueOnce('key').mockReturnValue('');

    await action();

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(core.exportVariable).not.toHaveBeenCalled();
  });
});
