import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

import { loadCacheKeys } from '../../src/utils/security-cache-keys.js';

const testFile = path.resolve(__dirname, 'cache-keys.test.yaml');

describe('utils/security-cache-keys', () => {
  afterEach(() => {
    if (fs.existsSync(testFile)) {
      fs.rmSync(testFile);
    }
  });

  test('It returns undefined for missing file', () => {
    const keys = loadCacheKeys();
    expect(keys).toBeUndefined();
  });

  test('It throws on incorrect JSON', () => {
    const invalid = [
      {
        method: 'post', // must be uppercase
        path: '/api/v1/test',
      },
    ];
    fs.writeFileSync(testFile, yaml.stringify(invalid), 'utf8');
    expect(() => loadCacheKeys(testFile)).toThrow();
  });

  test('It loads valid cache keys', () => {
    const expected = [
      {
        method: 'GET',
        path: '/api/v1/tests/*',
        query: { businessUnitId: '{businessUnitId}' },
      },
    ];
    fs.writeFileSync(testFile, yaml.stringify(expected), 'utf8');

    const cacheKeys = loadCacheKeys(testFile);
    expect(cacheKeys).toEqual(expected);
  });
});
