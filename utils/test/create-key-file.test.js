import fs from 'node:fs';

import mockFs from 'mock-fs';
import os from 'os';
import { afterAll, describe, expect, test } from 'vitest';

import createKeyFile from '../src/create-key-file.js';

describe('Create JSON key file', () => {
  afterAll(() => {
    mockFs.restore();
  });

  test('It creates a file from a base64 encoded string', async () => {
    // Create temp directory structure with a dummy file to ensure it exists
    // On macOS, /var is a symlink to /private/var, so we need both
    const tmpDir = os.tmpdir();
    const privateTmpDir = `/private${tmpDir}`;
    mockFs({
      [tmpDir]: {
        '.keep': '',
      },
      [privateTmpDir]: {
        '.keep': '',
      },
    });
    const base64key = Buffer.from('key-value', 'utf-8').toString('base64');
    const tmpFile = createKeyFile(base64key);
    expect(fs.readFileSync(tmpFile, 'utf-8')).toEqual('key-value');
  });
});
