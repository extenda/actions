const mockFs = require('mock-fs');

// Mock out tools download
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

jest.mock('@actions/exec');
const exec = require('@actions/exec');

const { convertPermissions } = require('../src/permconv');
const { loadTool } = require('../../utils');

describe('RS Permission Converter Tests', () => {
  afterAll(() => {
    mockFs.restore();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
