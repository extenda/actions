import * as core from '@actions/core';

import getToken from '../../cloud-deploy/src/utils/identity-token.js';
import loadServiceDefinition from '../../cloud-deploy/src/utils/service-definition.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { getFreezeEnd, isCodeFreeze } from '../src/code-freeze.js';
import getDeployInfo from '../src/deploy-info.js';
import action from '../src/index.js';
import { getPullRequestNumber, postComment } from '../src/pr-comment.js';
import resolveServiceFiles from '../src/service-files.js';

jest.mock('@actions/core');
jest.mock('../src/deploy-info');
jest.mock('../src/pr-comment');
jest.mock('../../cloud-deploy/src/utils/identity-token');
jest.mock('../../setup-gcloud');
jest.mock('../../cloud-deploy/src/utils/service-definition');
jest.mock('../src/service-files');
jest.mock('../src/code-freeze');

describe('cloud-deploy-plan', () => {
  beforeEach(() => {
    setupGcloud.mockResolvedValueOnce('project-id');
    getToken.mockResolvedValueOnce('token');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can plan multiple files in a PRs', async () => {
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('gh-token');

    core.getMultilineInput.mockReturnValueOnce([
      'cloud-deploy1.yaml',
      'cloud-deploy2.yaml',
    ]);
    resolveServiceFiles.mockReturnValueOnce([
      'cloud-deploy1.yaml',
      'cloud-deploy2.yaml',
    ]);
    loadServiceDefinition
      .mockReturnValueOnce({
        'cloud-run': {
          name: 'service1',
        },
      })
      .mockReturnValueOnce({ 'cloud-run': { name: 'service2' } });

    getDeployInfo
      .mockResolvedValueOnce({
        serviceName: 'service1',
        updates: false,
        vulnerabilities: false,
      })
      .mockResolvedValueOnce({
        serviceName: 'service2',
        updates: false,
        vulnerabilities: false,
      });

    getPullRequestNumber.mockResolvedValueOnce(1);

    await action();

    expect(getDeployInfo).toHaveBeenCalledTimes(2);
    expect(postComment).toHaveBeenCalledWith(
      'gh-token',
      1,
      expect.stringContaining('service2'),
    );
  });

  test('It skips the plan in non-PRs', async () => {
    getPullRequestNumber.mockResolvedValueOnce(NaN);
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('gh-token');
    core.getMultilineInput.mockReturnValueOnce(['cloud-deploy.yaml']);

    await action();

    expect(getDeployInfo).not.toHaveBeenCalled();
  });

  test('It includes code freeze notice', async () => {
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('gh-token');
    core.getMultilineInput.mockReturnValueOnce(['cloud-deploy.yaml']);
    resolveServiceFiles.mockReturnValueOnce(['cloud-deploy1.yaml']);
    loadServiceDefinition
      .mockReturnValueOnce({
        'cloud-run': {
          name: 'service1',
        },
      })
      .mockReturnValueOnce({ 'cloud-run': { name: 'service2' } });
    getDeployInfo.mockResolvedValueOnce({
      serviceName: 'service1',
      updates: false,
      vulnerabilities: false,
    });
    getPullRequestNumber.mockResolvedValueOnce(1);
    isCodeFreeze.mockReturnValueOnce(true);

    const freezeEnd = new Date();
    getFreezeEnd.mockReturnValueOnce(freezeEnd);

    await action();

    expect(getDeployInfo).toHaveBeenCalledTimes(1);
    expect(postComment).toHaveBeenCalledWith(
      'gh-token',
      1,
      expect.stringContaining(
        `The freeze will end ${freezeEnd.toISOString()}.`,
      ),
    );
  });
});
