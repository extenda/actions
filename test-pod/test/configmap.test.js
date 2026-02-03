jest.mock('@actions/exec');
import * as exec from '@actions/exec';

import { createConfigMap, deleteConfigMap } from '../src/configmap.js';

const orgEnv = process.env;

describe('ConfigMap', () => {
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REPOSITORY: 'extenda/actions',
      GITHUB_SHA: '15b1e9856fc56aaf79ddece96c0d931bf67227f0',
    };
    exec.exec.mockResolvedValueOnce(0);
  });

  test('It skips config map if no mounts are defined', async () => {
    const configMap = await createConfigMap({ namespace: 'test' }, '', '');
    expect(configMap).toBeNull();
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It creates configMap for working directory', async () => {
    const configMap = await createConfigMap(
      { namespace: 'test' },
      'test-pod/src',
      '',
    );
    expect(configMap).toEqual({
      name: 'actions-15b1e98',
      workingDirectory: true,
      entrypoint: false,
    });
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'create',
      'configmap',
      'actions-15b1e98',
      '-n',
      'test',
      '--from-file=test-pod/src',
    ]);
  });

  test('It creates configMap for entrypoint', async () => {
    const configMap = await createConfigMap(
      { namespace: 'test' },
      '',
      'test-pod/entrypoint.sh',
    );
    expect(configMap).toEqual({
      name: 'actions-15b1e98',
      workingDirectory: false,
      entrypoint: true,
    });
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'create',
      'configmap',
      'actions-15b1e98',
      '-n',
      'test',
      '--from-file=entrypoint.sh=test-pod/entrypoint.sh',
    ]);
  });

  test('It creates complete configMap with directory and entrypoint', async () => {
    const configMap = await createConfigMap(
      { namespace: 'test' },
      'test-pod/src',
      'test-pod/entrypoint.sh',
    );
    expect(configMap).toEqual({
      name: 'actions-15b1e98',
      workingDirectory: true,
      entrypoint: true,
    });
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'create',
      'configmap',
      'actions-15b1e98',
      '-n',
      'test',
      '--from-file=test-pod/src',
      '--from-file=entrypoint.sh=test-pod/entrypoint.sh',
    ]);
  });

  test('It deletes config map', async () => {
    await deleteConfigMap({ namespace: 'test' });
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'delete',
      'configmap',
      'actions-15b1e98',
      '-n',
      'test',
    ]);
  });
});
