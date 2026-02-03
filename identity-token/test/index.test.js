jest.mock('@actions/core');
jest.mock('../src/fetch-token');
jest.mock('../../setup-gcloud');

import core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud';
import fetchToken from '../src/fetch-token';
import action from '../src/index';

describe('Fetch identity token action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('my-sa@example.iam.gserviceaccount.com')
      .mockReturnValueOnce('bhq-braveheart-quotes');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(fetchToken).toHaveBeenCalledWith(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
  });
});
