import fs from 'node:fs';
import path from 'node:path';

import { restoreCache, saveCache } from '@actions/cache';
import * as core from '@actions/core';
import { loadTool } from 'action-utils';
import mockFs from 'mock-fs';
import os from 'os';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { authenticateGcloud } from '../src/auth-gcloud.js';
import { execGcloud } from '../src/exec-gcloud.js';
import getLatestVersion from '../src/latest-version.js';
import setupGcloud from '../src/setup-gcloud.js';

// Mock out tools download.
vi.mock('../../utils/src/index.js');

vi.mock('@actions/cache');
vi.mock('@actions/core');
vi.mock('../src/auth-gcloud.js');
vi.mock('../src/exec-gcloud.js');
vi.mock('../src/latest-version.js');

const jsonKey = {
  private_key: 'test-private-key',
  email: 'service-account@example.iam.gserviceaccount.com',
  project_id: 'test-project',
};

const base64Key = Buffer.from(JSON.stringify(jsonKey), 'utf8').toString(
  'base64',
);

const orgEnv = process.env;

describe('Setup Gcloud', () => {
  afterEach(() => {
    vi.resetAllMocks();
    process.env = orgEnv;
    mockFs.restore();
  });

  beforeEach(() => {
    process.env = {
      ...orgEnv,
      RUNNER_TEMP: '/tmp',
      RUNNER_TOOL_CACHE: '/opt/toolcache',
      RUNNER_ARCH: 'X64',
      RUNNER_OS: 'Linux',
      GITHUB_RUN_ID: '12345',
      GITHUB_RUN_ATTEMPT: '1',
    };

    delete process.env['GCLOUD_REQUESTED_VERSION'];
    delete process.env['GCLOUD_INSTALLED_VERSION'];

    loadTool.mockResolvedValue('/gcloud');
    saveCache.mockResolvedValue(1);
    authenticateGcloud.mockResolvedValue('test-project');
    execGcloud.mockResolvedValue('');
    getLatestVersion.mockResolvedValue('470.0.0');

    // On macOS, /var is a symlink to /private/var, so we need both.
    const tmpDir = os.tmpdir();
    const privateTmpDir = `/private${tmpDir}`;

    const filesystem = {
      '/gcloud/innerdir/__pycache__': { '.keep': '' },
      '/gcloud/.install/.backup': { '.keep': '' },
      '/testdir/__pycache__': { '.keep': '' },
      [process.env.RUNNER_TEMP]: { '.keep': '' },
      '/tmp/setup-gcloud-12345-1': { '.keep': '' },
      '/tmp/gcloud-config-12345-1': { '.keep': '' },
      [tmpDir]: { '.keep': '' },
      [privateTmpDir]: { '.keep': '' },
    };

    mockFs(filesystem);
    expect(fs.existsSync('/gcloud/innerdir/__pycache__')).toEqual(true);
    expect(fs.existsSync('/gcloud/.install/.backup')).toEqual(true);
    expect(fs.existsSync('/testdir/__pycache__')).toEqual(true);
  });

  test('It can configure gcloud latest', async () => {
    restoreCache.mockResolvedValueOnce(undefined);

    await setupGcloud(base64Key);

    expect(getLatestVersion).toHaveBeenCalled();
    expect(loadTool).toHaveBeenCalled();
    expect(execGcloud).toHaveBeenCalledWith([
      'components',
      'install',
      'gke-gcloud-auth-plugin',
      'beta',
      '--quiet',
      '--no-user-output-enabled',
    ]);
    expect(authenticateGcloud).toHaveBeenCalledWith(base64Key, false);
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GCLOUD_REQUESTED_VERSION',
      'latest',
    );
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GCLOUD_INSTALLED_VERSION',
      '470.0.0',
    );
    expect(fs.existsSync('/gcloud/innerdir/__pycache__')).toEqual(false);
    expect(fs.existsSync('/gcloud/.install/.backup')).toEqual(true);
    expect(fs.existsSync('/testdir/__pycache__')).toEqual(true);
  });

  test('It can configure gcloud 280.0.0 from cache', async () => {
    restoreCache.mockResolvedValueOnce('found');

    await setupGcloud(base64Key, '280.0.0');

    const cachePath = path.join(
      '/opt/toolcache',
      'gcloud',
      '280.0.0',
      'x64',
      'google-cloud-sdk',
    );
    expect(core.addPath).toHaveBeenCalledWith(path.join(cachePath, 'bin'));
    expect(execGcloud).not.toHaveBeenCalled();
    expect(authenticateGcloud).toHaveBeenCalledWith(base64Key, false);
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'GCLOUD_INSTALLED_VERSION',
      '280.0.0',
    );
  });

  test('setup-gcloud installs once for multiple setups on same version', async () => {
    process.env.GCLOUD_REQUESTED_VERSION = 'latest';
    process.env.GCLOUD_INSTALLED_VERSION = '470.0.0';

    await setupGcloud(base64Key, 'latest', true);

    expect(restoreCache).not.toHaveBeenCalled();
    expect(execGcloud).not.toHaveBeenCalled();
    expect(authenticateGcloud).toHaveBeenCalledWith(base64Key, true);

    // Authenticate is still invoked.
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
  });
});
