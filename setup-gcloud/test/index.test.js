import core from '@actions/core';

import { action } from '../src/index';
import setupGcloud from '../src/setup-gcloud';

jest.mock('../src/setup-gcloud');
jest.mock('@actions/core');

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
