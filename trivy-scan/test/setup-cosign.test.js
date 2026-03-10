import os from 'node:os';

import nock from 'nock';
import { afterEach, expect, test, vi } from 'vitest';

import { loadTool } from '../../utils/src/index.js';
import setupCosign from '../src/setup-cosign.js';

vi.mock('../../utils/src/index.js');
vi.mock('node:os');

afterEach(() => {
  vi.resetAllMocks();
  nock.cleanAll();
});

test('It can setup latest Cosign', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/sigstore/cosign/releases/latest')
    .reply(200, {
      tag_name: 'v2.4.0',
    });

  os.platform.mockReturnValue('linux');
  loadTool.mockResolvedValueOnce('/tmp/cosign');

  const cosignBinary = await setupCosign();

  expect(cosignBinary).toEqual('/tmp/cosign');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'cosign',
    binary: 'cosign',
    version: '2.4.0',
    downloadUrl:
      'https://github.com/sigstore/cosign/releases/download/v2.4.0/cosign-2.4.0.linux-amd64',
  });
});

test('It can setup Cosign on Windows', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/sigstore/cosign/releases/latest')
    .reply(200, {
      tag_name: 'v2.4.0',
    });

  os.platform.mockReturnValue('win32');
  loadTool.mockResolvedValueOnce('C:\\cosign\\cosign.exe');

  const cosignBinary = await setupCosign();

  expect(cosignBinary).toEqual('C:\\cosign\\cosign.exe');
  expect(scope.isDone()).toEqual(true);
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'cosign',
    binary: 'cosign.exe',
    version: '2.4.0',
    downloadUrl:
      'https://github.com/sigstore/cosign/releases/download/v2.4.0/cosign-2.4.0.windows-amd64.exe',
  });
});

test('It throws if latest Cosign version cannot be resolved', async () => {
  const scope = nock('https://api.github.com')
    .get('/repos/sigstore/cosign/releases/latest')
    .reply(500, {
      message: 'Internal Server Error',
    });

  await expect(setupCosign()).rejects.toThrow(
    'Failed to resolve latest cosign version. Response: 500 Internal Server Error',
  );
  expect(scope.isDone()).toEqual(true);
});
