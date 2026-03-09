import os from 'node:os';

import nock from 'nock';
import { afterEach, expect, test, vi } from 'vitest';

import { loadTool } from '../../utils/src/index.js';
import setupTrivy from '../src/setup-trivy.js';

vi.mock('../../utils/src/index.js');
vi.mock('node:os');

afterEach(() => {
  vi.resetAllMocks();
  nock.cleanAll();
});

test('It can setup latest Trivy', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/aquasecurity/trivy/releases/latest')
    .reply(200, {
      tag_name: 'v0.62.0',
    });

  os.platform.mockReturnValue('linux');
  loadTool.mockResolvedValueOnce('/tmp/trivy');

  const trivyBinary = await setupTrivy();

  expect(trivyBinary).toEqual('/tmp/trivy');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'trivy',
    binary: 'trivy',
    version: '0.62.0',
    downloadUrl:
      'https://github.com/aquasecurity/trivy/releases/download/v0.62.0/trivy_0.62.0_Linux-64bit.tar.gz',
  });
});

test('It can setup specified Trivy version', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/aquasecurity/trivy/releases/v0.50.0')
    .reply(200, {
      tag_name: 'v0.50.0',
    });

  os.platform.mockReturnValue('linux');
  loadTool.mockResolvedValueOnce('/tmp/trivy');

  const trivyBinary = await setupTrivy('v0.50.0');

  expect(trivyBinary).toEqual('/tmp/trivy');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'trivy',
    binary: 'trivy',
    version: '0.50.0',
    downloadUrl:
      'https://github.com/aquasecurity/trivy/releases/download/v0.50.0/trivy_0.50.0_Linux-64bit.tar.gz',
  });
});

test('It can setup specified Trivy version without tag prefix', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/aquasecurity/trivy/releases/v0.50.0')
    .reply(200, {
      tag_name: 'v0.50.0',
    });

  os.platform.mockReturnValue('linux');
  loadTool.mockResolvedValueOnce('/tmp/trivy');

  const trivyBinary = await setupTrivy('0.50.0');

  expect(trivyBinary).toEqual('/tmp/trivy');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'trivy',
    binary: 'trivy',
    version: '0.50.0',
    downloadUrl:
      'https://github.com/aquasecurity/trivy/releases/download/v0.50.0/trivy_0.50.0_Linux-64bit.tar.gz',
  });
});

test('It can setup Trivy on Windows', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/aquasecurity/trivy/releases/latest')
    .reply(200, {
      tag_name: 'v0.62.0',
    });

  os.platform.mockReturnValue('win32');
  loadTool.mockResolvedValueOnce('C:\\trivy\\trivy.exe');

  const trivyBinary = await setupTrivy();

  expect(trivyBinary).toEqual('C:\\trivy\\trivy.exe');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'trivy',
    binary: 'trivy.exe',
    version: '0.62.0',
    downloadUrl:
      'https://github.com/aquasecurity/trivy/releases/download/v0.62.0/trivy_0.62.0_windows-64bit.zip',
  });
});

test('It throws if an invalid version is provided', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/aquasecurity/trivy/releases/v0.invalid')
    .reply(404, {
      message: 'Not Found',
    });

  os.platform.mockReturnValue('linux');

  await expect(setupTrivy('v0.invalid')).rejects.toThrow(
    'Invalid Trivy version: v0.invalid. Response: 404 Not Found',
  );
  expect(scope.isDone()).toEqual(true);
});
