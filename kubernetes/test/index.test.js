import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import serviceDefinition from '../../cloud-run/src/service-definition.js';
import action from '../src/index.js';
import runDeploy from '../src/run-deploy.js';

vi.mock('@actions/core');
vi.mock('../src/run-deploy.js');
vi.mock('../../cloud-run/src/service-definition.js');

const orgEnv = process.env;

describe('Kubernetes Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REF: 'refs/heads/master',
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
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
