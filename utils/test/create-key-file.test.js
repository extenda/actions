import fs from 'fs';
import mockFs from 'mock-fs';

import createKeyFile from '../src/create-key-file.js';

describe('Create JSON key file', () => {
  afterAll(() => {
    mockFs.restore();
  });

  test('It creates a file from a base64 encoded string', async () => {
    mockFs({});
    const base64key = Buffer.from('key-value', 'utf-8').toString('base64');
    const tmpFile = createKeyFile(base64key);
    expect(fs.readFileSync(tmpFile, 'utf-8')).toEqual('key-value');
  });
});
