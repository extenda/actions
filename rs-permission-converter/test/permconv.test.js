import mockFs from 'mock-fs';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest';

// Mock out tools download
vi.mock('../../utils/src/index.js', () => ({
  loadTool: vi.fn(),
}));

vi.mock('@actions/exec');
import * as exec from '@actions/exec';

import { loadTool } from '../../utils/src/index.js';
import { convertPermissions } from '../src/permconv.js';

describe('RS Permission Converter Tests', () => {
  afterAll(() => {
    mockFs.restore();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  beforeEach(() => {
    mockFs({});
    loadTool.mockResolvedValueOnce('pkgbuilder');
    exec.exec.mockResolvedValueOnce(0);
  });

  test('the permission converter is called correctly for sql', async () => {
    await convertPermissions({
      binaryVersion: '1.0.0',
      type: 'sql',
      workDir: '/workDir',
      permFile: 'permFile',
      sqlFile: 'sqlFile',
    });
    expect(loadTool).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'sql',
      '-w',
      '/workDir',
      '-p',
      'permFile',
      '-s',
      'sqlFile',
    ]);
  });

  test('the permission converter is called correctly for resx', async () => {
    await convertPermissions({
      binaryVersion: '1.0.0',
      type: 'resx',
      workDir: '/workDir',
      permFile: 'permFile',
      outputDir: 'outputDir',
    });
    expect(loadTool).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'resx',
      '-w',
      '/workDir',
      '-p',
      'permFile',
      '-o',
      'outputDir',
    ]);
  });
});
