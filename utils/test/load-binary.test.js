import fs from 'node:fs';
import os from 'node:os';
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
    rmRF: async (target) => {
      const fs = await import('fs');
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
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

    // Fake cacheDir: copies sourceDir's contents into a separate destination,
    // mirroring the real tc.cacheDir's copy (not move) semantics. This matters
    // because load-binary.js removes sourceDir (tmpDir) after caching, so the
    // mock must not alias the cache location to the source directory.
    cacheDir: vi.fn(async (sourceDir, tool, version) => {
      const fs = await import('fs');
      const path = await import('path');
      const destDir = `/cache/${tool}/${version}`;
      const copyRecursive = (src, dest) => {
        fs.mkdirSync(dest, { recursive: true });
        for (const name of fs.readdirSync(src)) {
          const srcPath = path.join(src, name);
          const destPath = path.join(dest, name);
          if (fs.statSync(srcPath).isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            fs.writeFileSync(destPath, fs.readFileSync(srcPath));
          }
        }
      };
      copyRecursive(sourceDir, destDir);
      cacheStore.set(`${tool}-${version}`, destDir);
      return destDir;
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
      // Initial file for tc.downloadTool mock. This directory stands in for
      // RUNNER_TEMP: the real tc.downloadTool() saves its file directly here
      // (not in its own subdirectory), and other in-flight runner state lives
      // alongside it, which `other-runner-state` represents.
      '/tmp/downloads/temp-file': 'raw content',
      '/tmp/downloads/other-runner-state': 'do not touch me',

      // We also need the "random" path for downloadToolWithAuth
      // uuid returns 'fixed-uuid', so path is os.tmpdir() + /fixed-uuid/fixed-uuid
      // os.tmpdir() is /tmp on Linux but /var/folders/... on macOS, so make
      // sure that root exists in the mock filesystem on both. The
      // '/tmp/downloads' fixtures above are literal paths, independent of it.
      [os.tmpdir()]: { '.keep': '' },
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
    // io.cp copies temp-file into a private scratch dir as vswhere.exe
    // cacheDir caches that scratch dir's contents

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

  // The private scratch directory created via fs.mkdtempSync() gets a random
  // suffix we can't predict, so we detect it by what's left under os.tmpdir()
  // afterwards rather than by spying on mkdtempSync's return value.
  const scratchDirPattern = new RegExp(
    `^${RegExp.escape(path.join(os.tmpdir(), 'action-utils-'))}`,
  );
  const scratchDirsRemaining = () =>
    fs
      .readdirSync(os.tmpdir())
      .filter((name) => name.startsWith('action-utils-'));

  test('It cleans up its own scratch directory after caching, without touching the shared download directory', async () => {
    const tool = await loadTool(gcloud);

    // Extraction really did happen into a private scratch dir (not the
    // shared download directory) before it was cleaned up.
    expect(tc.extractTar).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(scratchDirPattern),
    );
    // The cached tool lives in its own directory...
    expect(fs.existsSync(tool)).toBe(true);
    // ...the private scratch directory used to extract it (which would
    // otherwise be left behind holding a full duplicate copy of the tool,
    // e.g. ~1GB+ for the gcloud SDK) must be gone...
    expect(scratchDirsRemaining()).toEqual([]);
    // ...but the directory the raw download landed in must be left alone:
    // for the non-auth path that's RUNNER_TEMP itself, shared with the
    // runner's own per-step bookkeeping files.
    expect(fs.existsSync('/tmp/downloads')).toBe(true);
    expect(fs.existsSync('/tmp/downloads/other-runner-state')).toBe(true);
    // Only the downloaded archive itself should have been removed from it.
    expect(fs.existsSync('/tmp/downloads/temp-file')).toBe(false);
  });

  test('It cleans up its scratch directory even if caching fails, without touching the shared download directory', async () => {
    tc.cacheDir.mockRejectedValueOnce(
      new Error('ENOSPC: no space left on device'),
    );

    await expect(loadTool(gcloud)).rejects.toThrow('ENOSPC');

    expect(tc.extractTar).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringMatching(scratchDirPattern),
    );
    // The scratch directory must not be left behind just because cacheDir()
    // itself failed (e.g. hit ENOSPC) - that would mean a failed install
    // still leaks the full extracted tool tree on every retry.
    expect(scratchDirsRemaining()).toEqual([]);
    // And the shared download directory must still be untouched.
    expect(fs.existsSync('/tmp/downloads/other-runner-state')).toBe(true);
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
