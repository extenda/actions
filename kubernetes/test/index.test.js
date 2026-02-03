import core from '@actions/core';

import serviceDefinition from '../../cloud-run/src/service-definition';
import action from '../src/index';
import runDeploy from '../src/run-deploy';

jest.mock('@actions/core');
jest.mock('../src/run-deploy');
jest.mock('../../cloud-run/src/service-definition');

const orgEnv = process.env;

describe('Kubernetes Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REF: 'refs/heads/master',
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It can run the action', async () => {
    serviceDefinition.mockReturnValueOnce({});
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce(serviceDefinition)
      .mockReturnValueOnce('image:tag')
      .mockReturnValueOnce('true');
    runDeploy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'image:tag',
      true,
    );
  });

  test('It rejects action if not trunk-based', async () => {
    core.getInput.mockReturnValue('test');
    process.env.GITHUB_REF = 'refs/heads/develop';
    await expect(action()).rejects.toThrow(
      /^Action not allowed on ref refs\/heads\/develop/,
    );
  });
});
