jest.mock('@actions/core');
jest.mock('../../setup-gcloud');

import * as core from '@actions/core';

import { execGcloud, setupGcloud } from '../../setup-gcloud/src/index.js';
import action from '../src/index.js';

describe('action', () => {
  beforeEach(() => {
    setupGcloud.mockResolvedValue('stub-project-id');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('routes traffic to new revision', async () => {
    const stubValues = {
      'service-account-key': 'service-account-key-stub',
      service: 'service1',
      'target-revision': 'revision1',
      percentage: '100',
    };

    core.getInput.mockImplementation((name) => stubValues[name]);
    execGcloud.mockResolvedValueOnce(stubValues['target-revision']);
    const serviceManagerUrl =
      'https://operations.retailsvc.com/ui/platform/service-manager/stub-project-id/service1';
    await expect(action()).rejects.toThrow(
      'This action is deprecated and is going to be removed soon. ' +
        `It's recommended to use [Service manager UI](${serviceManagerUrl}) instead.`,
    );
  });
});
