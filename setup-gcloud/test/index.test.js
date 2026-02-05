import * as core from '@actions/core';
import { describe, expect, test, vi } from 'vitest';

import { action } from '../src/index.js';
import setupGcloud from '../src/setup-gcloud.js';

vi.mock('../src/setup-gcloud.js');
vi.mock('@actions/core');

describe('setup-gcloud action', () => {
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
});
