import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createConfigMap, deleteConfigMap } from '../src/configmap.js';
import configureKubeCtl from '../src/configure-kubectl.js';
import action from '../src/index.js';
import runPod from '../src/run-pod.js';

vi.mock('@actions/core');
vi.mock('../src/configure-kubectl.js');
vi.mock('../src/configmap.js');
vi.mock('../src/run-pod.js');

describe('test-pod Action', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  beforeEach(() => {
    core.getInput
      .mockReturnValueOnce('sa')
      .mockReturnValueOnce('myimage')
      .mockReturnValueOnce('namespace')
      .mockReturnValueOnce('cluster')
      .mockReturnValueOnce('entrypoint')
      .mockReturnValueOnce('dir')
      .mockReturnValueOnce('true');

    configureKubeCtl.mockResolvedValueOnce({ namespace: 'namespace' });
    createConfigMap.mockResolvedValueOnce({ name: 'configmap' });
  });

  test('It runs a test in a Pod', async () => {
    runPod.mockResolvedValueOnce(0);
    await action();
    expect(configureKubeCtl).toHaveBeenCalledWith('sa', 'cluster', 'namespace');
    expect(createConfigMap).toHaveBeenCalledWith(
      { namespace: 'namespace' },
      'dir',
      'entrypoint',
    );
    expect(runPod).toHaveBeenCalledWith(
      { namespace: 'namespace' },
      'myimage',
      { name: 'configmap' },
      true,
    );
    expect(deleteConfigMap).toHaveBeenCalledWith({ namespace: 'namespace' });
  });

  test('It deletes config map on failure', async () => {
    runPod.mockRejectedValueOnce(new Error('Pod failure'));
    await expect(action()).rejects.toEqual(new Error('Pod failure'));
    expect(deleteConfigMap).toHaveBeenCalled();
  });
});
