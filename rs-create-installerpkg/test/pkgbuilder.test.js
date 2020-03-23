const mockFs = require('mock-fs');

jest.mock('@actions/exec');

// Mock out tools download
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

const exec = require('@actions/exec');
const { loadTool } = require('../../utils');
const { buildPackage } = require('../src/pkgbuilder');


describe('RS installer package tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    mockFs.restore();
  });

  test('It can run the builder', async () => {
    mockFs({
      workdir: {},
      output: {},
    });
    loadTool.mockResolvedValueOnce('pkgbuilder');
    exec.exec.mockResolvedValueOnce(0);
    await buildPackage({
      builderType: 'single',
      binaryVersion: '1.1.0',
      packageName: 'Test_PkgName',
      workingDir: 'workdir',
      outputDir: 'output',
      sourcePaths: __dirname,
      sourceFilePaths: '',
      packageVersion: '1.0.1-testversion',
    });

    expect(loadTool).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'single',
      '-pn',
      'Test_PkgName',
      '-wd',
      'workdir',
      '-od',
      'output',
      '-sp',
      __dirname,
      '-sfp',
      '',
      '-pv',
      '1.0.1-testversion',
    ]);
  });
});
