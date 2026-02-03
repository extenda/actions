import fs from 'fs';
import mockFs from 'mock-fs';
import path from 'path';

const mockUnpack = async (file, dest) => {
  const sdk = path.join(dest, 'google-cloud-sdk');
  fs.mkdirSync(sdk);
  fs.mkdirSync(path.join(sdk, 'bin'));
  fs.writeFileSync(
    path.join(sdk, 'bin', 'gcloud'),
    'gcloud executable',
    'utf8',
  );
  fs.writeFileSync(
    path.join(sdk, 'bin', 'gsutil'),
    'gsutil executable',
    'utf8',
  );
  return dest;
};

jest.mock('@actions/tool-cache', () => {
  const realTc = jest.requireActual('@actions/tool-cache');
  return {
    ...realTc,
    downloadTool: jest.fn(),
    extractTar: mockUnpack,
    extractZip: mockUnpack,
    extract7z: mockUnpack,
  };
});

jest.mock('axios');

import tc from '@actions/tool-cache';
import axios from 'axios';

import { loadTool } from '../src/load-binary';

const orgEnv = process.env;

const vswhere = {
  tool: 'vswhere',
  binary: 'vswhere.exe',
  version: '2.7.1',
  downloadUrl: 'https://test.com/vswhere.exe',
};

const gcloud = {
  tool: 'gcloud',
  binary: 'google-cloud-sdk',
  version: '282.0.0',
  downloadUrl: 'https://test.com/google-cloud-sdk-282.0.0-linux-x86_64.tar.gz',
};

describe('Load tool', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      RUNNER_TOOL_CACHE: '/Users/actions/cache',
    };
    mockFs({
      '/Users/actions/cache': {
        'tmp-1': 'vswhere raw binary',
        'tmp-2': 'tar.gz file',
        'tmp-3': 'zip file',
        'tmp-4': '7z file',
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
    process.env = orgEnv;
  });

  test('It can download a raw binary', async () => {
    tc.downloadTool.mockResolvedValueOnce('/Users/actions/cache/tmp-1');
    const tool = await loadTool(vswhere);
    expect(fs.existsSync(tool)).toEqual(true);
    expect(path.basename(tool)).toEqual('vswhere.exe');
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(tc.downloadTool).toHaveBeenCalledWith(vswhere.downloadUrl);
  });

  test('It will cache a downloaded tool', async () => {
    tc.downloadTool.mockResolvedValue('/Users/actions/cache/tmp-1');
    await loadTool(vswhere);
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    await loadTool(vswhere);
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
  });

  test('It can download a gzipped tool', async () => {
    tc.downloadTool.mockResolvedValue('/Users/actions/cache/tmp-2');
    const tool = await loadTool(gcloud);
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(tool)).toEqual(true);
    expect(path.basename(tool)).toEqual('google-cloud-sdk');

    // We can access multiple binaries within the downloaded (and cached) directory.
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toEqual(true);
    expect(fs.existsSync(path.join(tool, 'bin', 'gsutil'))).toEqual(true);
  });

  test('It can download a zipped tool', async () => {
    tc.downloadTool.mockResolvedValue('/Users/actions/cache/tmp-3');
    const tool = await loadTool({
      ...gcloud,
      downloadUrl: 'gcloud.zip',
    });
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(path.basename(tool)).toEqual('google-cloud-sdk');
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toEqual(true);
    expect(fs.existsSync(path.join(tool, 'bin', 'gsutil'))).toEqual(true);
  });

  test('It can download a 7z tool', async () => {
    tc.downloadTool.mockResolvedValue('/Users/actions/cache/tmp-4');
    const tool = await loadTool({
      ...gcloud,
      downloadUrl: 'gcloud.7z',
    });
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(path.basename(tool)).toEqual('google-cloud-sdk');
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toEqual(true);
    expect(fs.existsSync(path.join(tool, 'bin', 'gsutil'))).toEqual(true);
  });

  describe('With authentication', () => {
    test('It can download a raw binary', async () => {
      axios.mockResolvedValueOnce({
        headers: {
          'content-length': 100,
        },
        data: fs.createReadStream('/Users/actions/cache/tmp-1'),
      });
      const tool = await loadTool({
        ...vswhere,
        auth: {
          username: 'test',
          password: 'test',
        },
      });
      expect(axios).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(tool)).toEqual(true);
    });

    test('It can download a gzipped tool', async () => {
      axios.mockResolvedValueOnce({
        headers: {
          'content-length': 100,
        },
        data: fs.createReadStream('/Users/actions/cache/tmp-3'),
      });
      const tool = await loadTool({
        ...gcloud,
        auth: {
          username: 'test',
          password: 'test',
        },
      });
      expect(axios).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toEqual(true);
      expect(fs.existsSync(path.join(tool, 'bin', 'gsutil'))).toEqual(true);
    });
  });
});
