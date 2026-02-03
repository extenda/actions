jest.mock('@actions/core');
jest.mock('../src/create-sign-attestion');
jest.mock('../../setup-gcloud');

import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import {
  createAttestation,
  getArtifactUrl,
} from '../src/create-sign-attestion.js';
import action from '../src/index.js';

describe('Binary Auth Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    getArtifactUrl.mockReturnValueOnce('eu.gcr.io/my-iamge@887686');
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('quality-assurance-attestor')
      .mockReturnValueOnce('attestor-project')
      .mockReturnValueOnce('key-project')
      .mockReturnValueOnce('europe-west1')
      .mockReturnValueOnce('global-keyring')
      .mockReturnValueOnce('key')
      .mockReturnValueOnce('1')
      .mockReturnValueOnce('eu.gcr.io/my-iamge');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(9);
    expect(createAttestation).toHaveBeenCalledWith(
      'eu.gcr.io/my-iamge@887686',
      'quality-assurance-attestor',
      'attestor-project',
      'key-project',
      'europe-west1',
      'global-keyring',
      'key',
      '1',
    );
  });
});
