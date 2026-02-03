jest.mock('@actions/core');
jest.mock('../src/bug-log.js');
jest.mock('../src/deploy-log.js');

import * as core from '@actions/core';

import generateBugLog from '../src/bug-log.js';
import { generateFolders } from '../src/deploy-log.js';
import action from '../src/index.js';

describe('DORA metrics action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput
      .mockReturnValueOnce('iam')
      .mockReturnValueOnce('product-component')
      .mockReturnValueOnce('jira-username')
      .mockReturnValueOnce('jira-password')
      .mockReturnValueOnce('jira-project-key');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(generateBugLog).toHaveBeenCalledWith(
      'jira-username',
      'jira-password',
      'jira-project-key',
      'iam',
      'product-component',
    );
    expect(generateFolders).toHaveBeenCalledWith('iam');
  });
});
