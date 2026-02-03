import fs from 'fs';
import mockFs from 'mock-fs';
import path from 'path';

// Mock out tools download
jest.mock('../../utils/src/index.js', () => ({
  loadTool: async () => Promise.resolve('/gcloud'),
  findTool: jest.fn(),
}));

jest.mock('@actions/cache');
jest.mock('@actions/exec');
jest.mock('@actions/core');

import { restoreCache } from '@actions/cache';
import * as core from '@actions/core';
import * as exec from '@actions/exec';

import setupGcloud from '../src/setup-gcloud.js';

const jsonKey = {
  project_id: 'test-project',
};

const base64Key = Buffer.from(JSON.stringify(jsonKey), 'utf8').toString(
  'base64',
);

const orgEnv = process.env;

describe('Setup Gcloud', () => {
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
    mockFs.restore();
  });

  beforeEach(() => {
    process.env = {
      RUNNER_TEMP: '/tmp',
      RUNNER_TOOL_CACHE: '/opt/toolcache',
      RUNNER_ARCH: 'X64',
      ...orgEnv,
    };

    delete process.env['GCLOUD_REQUESTED_VERSION'];

    const filesystem = {
      '/gcloud/innerdir/__pycache__': {},
      '/gcloud/.install/.backup': {},
      '/testdir/__pycache__': {},
    };
    filesystem[process.env.RUNNER_TEMP] = {};
    mockFs(filesystem);
    expect(fs.existsSync('/gcloud/innerdir/__pycache__')).toEqual(true);
    expect(fs.existsSync('/gcloud/.install/.backup')).toEqual(true);
    expect(fs.existsSync('/testdir/__pycache__')).toEqual(true);
  });

  test('It can configure gcloud latest', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce(undefined); // No cache entry.
    await setupGcloud(base64Key);
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec).toHaveBeenNthCalledWith(
      1,
      'gcloud',
      expect.arrayContaining(['install', 'gke-gcloud-auth-plugin']),
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenNthCalledWith(
      2,
      'gcloud',
      expect.arrayContaining(['auth', 'activate-service-account']),
      expect.anything(),
    );
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_CORE_PROJECT',
      'test-project',
    );
    expect(fs.existsSync('/gcloud/innerdir/__pycache__')).toEqual(false);
    expect(fs.existsSync('/gcloud/.install/.backup')).toEqual(true);
    expect(fs.existsSync('/testdir/__pycache__')).toEqual(true);
  });

  test('It can configure gcloud 280.0.0 from cache', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce('found');
    await setupGcloud(base64Key, '280.0.0');
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith(
      'gcloud',
      expect.arrayContaining(['auth', 'activate-service-account']),
      expect.anything(),
    );
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'CLOUDSDK_CORE_PROJECT',
      'test-project',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GCLOUD_INSTALLED_VERSION',
      '280.0.0',
    );
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS', async () => {
    process.env.GCLOUD_REQUESTED_VERSION = 'diff';
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce(undefined);
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GOOGLE_APPLICATION_CREDENTIALS',
      expect.any(String),
    );
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS and copy tmp file', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce('found');
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable).toHaveBeenNthCalledWith(
      3,
      'GOOGLE_APPLICATION_CREDENTIALS',
      expect.any(String),
    );
    const keyFile = path.parse(core.exportVariable.mock.calls[2][1]);
    expect(keyFile.dir).toEqual(path.normalize(process.env.RUNNER_TEMP));
  });

  test('setup-gcloud installs once for multiple setups on same version', async () => {
    exec.exec.mockResolvedValueOnce(0);
    process.env.GCLOUD_REQUESTED_VERSION = 'latest';
    await setupGcloud(base64Key, 'latest', true);
    expect(restoreCache).not.toHaveBeenCalled();

    // Authenticate is still invoked.
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
  });
});
