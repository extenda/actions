import mockFs from 'mock-fs';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('@actions/exec');
// Make sure we get a mocked FS.
import fs from 'node:fs';

import * as exec from '@actions/exec';

import deployDocumentation from '../src/redoc.js';

describe('Run redoc deploy', () => {
  afterEach(() => {
    vi.resetAllMocks();
    mockFs.restore();
  });

  test('It can run the action and the files are generated', async () => {
    mockFs({});
    await deployDocumentation(
      'yamlfile',
      'apiName',
      'version',
      'bucket',
      'systemName',
    );

    expect(fs.existsSync('Versionsindex.html')).toEqual(true);
    expect(fs.existsSync('APIsindex.html')).toEqual(true);
    expect(fs.existsSync('Systemsindex.html')).toEqual(true);
    expect(exec.exec).toHaveBeenCalledTimes(12);
  });
});
