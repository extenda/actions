import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('../src/deploy.js');
vi.mock('../src/kubectl.js');
vi.mock('../src/manifests.js');
vi.mock('../src/env-config.js');
vi.mock('../src/configure-domains.js');
vi.mock('../../setup-gcloud/src/index.js');

import * as core from '@actions/core';

import deploy from '../src/deploy.js';
import prepareEnvConfig from '../src/env-config.js';
import action from '../src/index.js';
import kubectl from '../src/kubectl.js';
import createManifests from '../src/manifests.js';

const orgEnv = process.env;

describe('txengine-deploy', () => {
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

  test('It can deploy txengine', async () => {
    core.getInput
      .mockReturnValueOnce('deploy-account')
      .mockReturnValueOnce('secret-account')
      .mockReturnValueOnce('image')
      .mockReturnValueOnce('tenant')
      .mockReturnValueOnce('SE');

    prepareEnvConfig.mockResolvedValueOnce({
      replaceTokens: { NAMESPACE: 'test' },
      configMap: {},
      secrets: {},
    });

    kubectl.configure.mockResolvedValueOnce('test-staging-project');
    createManifests.mockResolvedValueOnce({
      file: 'file.yaml',
      content: 'test',
      namespace: 'test-namespace',
    });

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(kubectl.configure).toHaveBeenCalledWith('deploy-account');
    expect(createManifests).toHaveBeenCalledTimes(1);
    expect(deploy).toHaveBeenCalledTimes(1);
  });

  test('It rejects action if not trunk-based', async () => {
    core.getInput.mockReturnValue('test');
    process.env.GITHUB_REF = 'refs/heads/develop';
    await expect(action()).rejects.toThrow(
      /^Action not allowed on ref refs\/heads\/develop/,
    );
  });
});
