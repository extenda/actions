import fs from 'node:fs';
import path from 'node:path';

import mockFs from 'mock-fs';
import stream from 'stream';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock UUID for deterministic paths
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('fixed-uuid'),
}));

// Hoist cache state
const { cacheStore } = vi.hoisted(() => ({ cacheStore: new Map() }));

// Mock @actions/io to use memfs
vi.mock('@actions/io', async () => {
  return {
    cp: async (src, dest) => {
      const fs = await import('fs');
      // Simple copy for tests
      fs.writeFileSync(dest, fs.readFileSync(src));
    },
  };
});

// Mock @actions/tool-cache
vi.mock('@actions/tool-cache', async () => {
  const actual = await vi.importActual('@actions/tool-cache');
  return {
    ...actual,
    // Simple stateful find
    find: vi.fn((tool, version) => cacheStore.get(`${tool}-${version}`) || ''),

    // Fake downloader returns a fixed path in memfs
    downloadTool: vi.fn(async () => '/tmp/downloads/temp-file'),

    // Fake extractors just ensure the *destination* file exists
    // (We don't actually need to unzip anything, just creating the file
    // satisfies the 'existsSync' check in the test)
    extractTar: vi.fn(async (file, dest) => {
      const fs = await import('fs');
      const path = await import('path');
      // Mimic extracting the expected binary structure
      const binPath = path.join(dest, 'google-cloud-sdk/bin');
      fs.mkdirSync(binPath, { recursive: true });
      fs.writeFileSync(path.join(binPath, 'gcloud'), 'content');
      fs.writeFileSync(path.join(binPath, 'gsutil'), 'content');
      return dest;
    }),
    extractZip: vi.fn(async (file, dest) => {
      const fs = await import('fs');
      const path = await import('path');
      const binPath = path.join(dest, 'google-cloud-sdk/bin');
      fs.mkdirSync(binPath, { recursive: true });
      fs.writeFileSync(path.join(binPath, 'gcloud'), 'content');
      fs.writeFileSync(path.join(binPath, 'gsutil'), 'content');
      return dest;
    }),
    extract7z: vi.fn(async (file, dest) => {
      const fs = await import('fs');
      const path = await import('path');
      const binPath = path.join(dest, 'google-cloud-sdk/bin');
      fs.mkdirSync(binPath, { recursive: true });
      fs.writeFileSync(path.join(binPath, 'gcloud'), 'content');
      fs.writeFileSync(path.join(binPath, 'gsutil'), 'content');
      return dest;
    }),

    // Fake cacheDir: Just map the tool to the SOURCE directory.
    // This avoids needing to write complex recursive file copying logic in the mock.
    // The test just wants to know if the file exists at the returned path.
    cacheDir: vi.fn(async (sourceDir, tool, version) => {
      cacheStore.set(`${tool}-${version}`, sourceDir);
      return sourceDir;
    }),
  };
});

// Mock Axios for Auth tests
vi.mock('axios');

import * as tc from '@actions/tool-cache';
import axios from 'axios';

import { loadTool } from '../src/load-binary.js';

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

    // Reset cache state
    cacheStore.clear();

    // Setup virtual filesystem
    mockFs({
      // Initial file for tc.downloadTool mock
      '/tmp/downloads/temp-file': 'raw content',

      // We also need the "random" path for downloadToolWithAuth
      // uuid returns 'fixed-uuid', so path is os.tmpdir() + /fixed-uuid/fixed-uuid
      // os.tmpdir() usually defaults to /tmp in memfs or real os.
      // We'll rely on recursive mkdir in the source code to handle creation,
      // but let's ensure the root exists.
      '/tmp': { '.keep': '' },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockFs.restore();
    process.env = orgEnv;
  });

  test('It can download a raw binary', async () => {
    // tc.downloadTool is mocked to return '/tmp/downloads/temp-file'
    // loadTool -> internalDownload -> downloadTool (mock)
    // tmpDir = /tmp/downloads
    // io.cp copies temp-file to /tmp/downloads/vswhere.exe
    // cacheDir caches /tmp/downloads

    const tool = await loadTool(vswhere);

    expect(fs.existsSync(tool)).toBe(true);
    expect(path.basename(tool)).toBe('vswhere.exe');
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(tc.downloadTool).toHaveBeenCalledWith(vswhere.downloadUrl);
  });

  test('It will cache a downloaded tool', async () => {
    await loadTool(vswhere);
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);

    // Second call should find it in cacheStore
    await loadTool(vswhere);
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
  });

  test('It can download a gzipped tool', async () => {
    const tool = await loadTool(gcloud);

    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(path.basename(tool)).toBe('google-cloud-sdk'); // find joins dir + binary

    // Verify extraction happened (our mock created these files)
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toBe(true);
    expect(fs.existsSync(path.join(tool, 'bin', 'gsutil'))).toBe(true);
  });

  test('It can download a zipped tool', async () => {
    const tool = await loadTool({
      ...gcloud,
      downloadUrl: 'gcloud.zip',
    });

    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(path.basename(tool)).toBe('google-cloud-sdk');
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toBe(true);
  });

  test('It can download a 7z tool', async () => {
    const tool = await loadTool({
      ...gcloud,
      downloadUrl: 'gcloud.7z',
    });
    expect(tc.downloadTool).toHaveBeenCalledTimes(1);
    expect(path.basename(tool)).toBe('google-cloud-sdk');
    expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toBe(true);
  });

  describe('With authentication', () => {
    test('It can download a raw binary via Axios', async () => {
      // Mock axios to return a stream
      const readable = new stream.Readable();
      readable.push('binary data');
      readable.push(null); // End of stream

      axios.mockResolvedValueOnce({
        headers: { 'content-length': 100 },
        data: readable,
      });

      const tool = await loadTool({
        ...vswhere,
        auth: { username: 'user', password: 'pwd' },
      });

      expect(axios).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(tool)).toBe(true);
    });

    test('It can download a gzipped tool via Axios', async () => {
      const readable = new stream.Readable();
      readable.push('binary data');
      readable.push(null);

      axios.mockResolvedValueOnce({
        headers: { 'content-length': 100 },
        data: readable,
      });

      const tool = await loadTool({
        ...gcloud,
        auth: { username: 'user', password: 'pwd' },
      });

      expect(axios).toHaveBeenCalledTimes(1);

      // Our extractTar mock handles the file creation, so we check if it ran
      expect(fs.existsSync(path.join(tool, 'bin', 'gcloud'))).toBe(true);
    });
  });
});
