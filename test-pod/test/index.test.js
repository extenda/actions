import * as core from '@actions/core';

import { createConfigMap, deleteConfigMap } from '../src/configmap.js';
import configureKubeCtl from '../src/configure-kubectl.js';
import action from '../src/index.js';
import runPod from '../src/run-pod.js';

jest.mock('@actions/core');
jest.mock('../src/configure-kubectl');
jest.mock('../src/configmap');
jest.mock('../src/run-pod');

describe('test-pod Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
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
