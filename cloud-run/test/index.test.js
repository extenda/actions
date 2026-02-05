import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('../src/run-deploy.js');
vi.mock('../src/service-definition.js');
vi.mock('../src/configure-domains.js');

import * as core from '@actions/core';

import action from '../src/index.js';
import runDeploy from '../src/run-deploy.js';
import serviceDef from '../src/service-definition.js';

const orgEnv = process.env;

describe('Cloud Run Action', () => {
  afterEach(() => {
    vi.resetAllMocks();
    process.env = orgEnv;
  });

  beforeEach(() => {
    process.env = { ...orgEnv };
  });

  test('It can run the action', async () => {
    process.env.GITHUB_REF = 'refs/heads/master';
    serviceDef.mockReturnValueOnce({});
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
    );
  });

  test('It can run without optional args', async () => {
    process.env.GITHUB_REF = 'refs/heads/master';
    serviceDef.mockReturnValueOnce({});
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      false,
    );
  });

  test('It can run with verbose flag set', async () => {
    process.env.GITHUB_REF = 'refs/heads/main';
    serviceDef.mockReturnValueOnce({});
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('true');
    runDeploy.mockResolvedValueOnce({});

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(7);
    expect(runDeploy).toHaveBeenCalledWith(
      'service-account',
      {},
      'gcr.io/project/image:tag',
      true,
    );
  });

  test('It cannot run the action if branch is not master or main', async () => {
    process.env.GITHUB_REF = 'refs/heads/develop';
    serviceDef.mockReturnValueOnce({});
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('gcr.io/project/image:tag')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('dns')
      .mockReturnValueOnce('false');
    await expect(action()).rejects.toThrow(
      /^Action not allowed on ref refs\/heads\/develop/,
    );
  });
});
