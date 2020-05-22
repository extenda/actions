const mockFs = require('mock-fs');

jest.mock('@actions/exec');

// Mock out tools download
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

const exec = require('@actions/exec');
// const path = require('path');
// const { request } = require('request');
const { loadTool } = require('../../utils');
const { buildPackage } = require('../src/pkgbuilder');
const { publishPackage } = require('../src/pkgbuilder');

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
      'output/Test_PkgName_1.0.1-testversion.pkg.zip': Buffer.from('test content'),
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
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
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
      '-pv',
      '1.0.1-testversion',
      '-sp',
      __dirname,
    ]);
  });

  test('publishPackage() publish package to nexus', async () => {
    mockFs({
      workdir: {},
      output: {},
      'output/Test_PkgName_1.0.1-testversion.pkg.zip': Buffer.from('test content'),
    });
    // request.mockResolvedValueOnce(0);
    await publishPackage({
      packageName: 'RS_TestPackage',
      packageVersion: '1.0.0',
      outputDir: 'output',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
    });
    expect(() => {
      publishPackage({
        packageName: 'RS_TestPackage',
        packageVersion: '1.0.0',
        outputDir: 'output',
        publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
        branch: 'develop',
      });
    }).toThrow();
  });
});
