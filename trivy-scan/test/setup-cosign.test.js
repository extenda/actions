import os from 'node:os';

import { loadTool } from 'action-utils';
import nock from 'nock';
import { afterEach, expect, test, vi } from 'vitest';

import setupCosign from '../src/setup-cosign.js';

vi.mock('action-utils');
vi.mock('node:os');

afterEach(() => {
  vi.resetAllMocks();
  nock.cleanAll();
});

test('It can setup Cosign', async () => {
  os.platform.mockReturnValue('linux');
  loadTool.mockResolvedValueOnce('/tmp/cosign');

  const cosignBinary = await setupCosign();

  expect(cosignBinary).toEqual('/tmp/cosign');
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'cosign',
    binary: 'cosign',
    version: '3.0.5',
    downloadUrl:
      'https://github.com/sigstore/cosign/releases/download/v3.0.5/cosign-linux-amd64',
  });
});

test('It can setup Cosign on Windows', async () => {
  os.platform.mockReturnValue('win32');
  loadTool.mockResolvedValueOnce('C:\\cosign\\cosign.exe');

  const cosignBinary = await setupCosign();

  expect(cosignBinary).toEqual('C:\\cosign\\cosign.exe');
  expect(loadTool).toHaveBeenCalledWith({
    tool: 'cosign',
    binary: 'cosign.exe',
    version: '3.0.5',
    downloadUrl:
      'https://github.com/sigstore/cosign/releases/download/v3.0.5/cosign-windows-amd64.exe',
  });
});
