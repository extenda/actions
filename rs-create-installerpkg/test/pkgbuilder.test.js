require('jest-fetch-mock')
  .enableMocks();

const mockFs = require('mock-fs');
const exec = require('@actions/exec');
const core = require('@actions/core');
const os = require('os');

const { loadTool } = require('../../utils');
const { getBinaryName } = require('../src/pkgbuilder');
const { buildPackage } = require('../src/pkgbuilder');
const { publishPackageCommand } = require('../src/pkgbuilder');
const { packageBuilderCommand } = require('../src/pkgbuilder');

jest.mock('@actions/exec');
jest.mock('@actions/core');
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));


describe('RS installer package tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
    // eslint-disable-next-line no-undef
    fetch.resetMocks();
  });

  test('packageBuilderCommand() executed with correct args', async () => {
    mockFs({
      output: {},
    }, {});
    const args = {
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
      publishPackage: true,
    };
    await packageBuilderCommand(loadTool, args);

    expect(exec.exec)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1])
      .toEqual([
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

  test('packageBuilderCommand() sets specified sourcePaths', async () => {
    mockFs({
      output: {},
    }, {});
    const args = {
      builderType: 'single',
      binaryVersion: '1.1.0',
      packageName: 'Test_PkgName',
      workingDir: 'workdir',
      outputDir: 'output',
      sourcePaths: 'testSourcePaths',
      sourceFilePaths: '',
      packageVersion: '1.0.1-testversion',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: true,
    };

    await packageBuilderCommand(loadTool, args);

    expect(exec.exec)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1])
      .toEqual([
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
        'testSourcePaths',
      ]);
  });

  test('packageBuilderCommand() sets specified sourceFilePaths', async () => {
    mockFs({
      output: {},
    }, {});
    const args = {
      builderType: 'single',
      binaryVersion: '1.1.0',
      packageName: 'Test_PkgName',
      workingDir: 'workdir',
      outputDir: 'output',
      sourcePaths: __dirname,
      sourceFilePaths: 'testSourceFilePaths',
      packageVersion: '1.0.1-testversion',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: true,
    };

    await packageBuilderCommand(loadTool, args);

    expect(exec.exec)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1])
      .toEqual([
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
        '-sfp',
        'testSourceFilePaths',
      ]);
  });

  test('publishPackageCommand() reports success when received OK response', async () => {
    mockFs({
      output: {
        'RS_TestPackage_1.0.0.pkg.zip': Buffer.from('test content'),
      },
    }, {});
    // eslint-disable-next-line no-undef
    fetch.mockResponse(JSON.stringify({
      status: '200',
      statusText: 'OK',
    }));

    await publishPackageCommand({
      packageName: 'RS_TestPackage',
      packageVersion: '1.0.0',
      outputDir: 'output',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: true,
    });
    // eslint-disable-next-line no-undef
    expect(fetch)
      .toHaveBeenCalledTimes(1);
    expect(core.info)
      .toBeCalledTimes(3);
    expect(core.error)
      .not
      .toBeCalled();
  });

  test('publishPackageCommand() reports error when response failed', async () => {
    mockFs({
      output: {
        'RS_TestPackage_1.0.0.pkg.zip': Buffer.from('test content'),
      },
    }, {});
    // eslint-disable-next-line no-undef
    fetch.mockReject({
      status: '503',
      statusText: 'Test',
    });

    await publishPackageCommand({
      packageName: 'RS_TestPackage',
      packageVersion: '1.0.0',
      outputDir: 'output',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: true,
    });
    // eslint-disable-next-line no-undef
    expect(fetch)
      .toHaveBeenCalledTimes(1);
    expect(core.error)
      .toBeCalledTimes(1);
    expect(core.error)
      .toBeCalledWith('Failed to publish package, server responded with 503 Test');
  });

  test('getBinaryName() returns correct binary name', () => {
    jest.spyOn(os, 'platform');
    os.platform.mockReturnValue('win32');
    expect(getBinaryName())
      .toBe('InstallerPackageBuilder.Core.Console.exe');

    os.platform.mockReturnValue('win33test');
    expect(getBinaryName())
      .toBe('InstallerPackageBuilder.Core.Console');

    expect(os.platform)
      .toBeCalledTimes(2);
    jest.unmock('os');
  });

  test('It can run the builder', async () => {
    mockFs({
      workdir: {},
      output: {},
      'output/Test_PkgName_1.0.1-testversion.pkg.zip': Buffer.from('test content'),
    });

    loadTool.mockResolvedValueOnce('pkgbuilder');
    await buildPackage({
      builderType: 'single',
      binaryVersion: '1.1.1',
      packageName: 'Test_PkgName',
      workingDir: 'workdir',
      outputDir: 'output',
      sourcePaths: 'output',
      sourceFilePaths: '',
      packageVersion: '1.0.1-testversion',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: true,
    });

    expect(loadTool)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1])
      .toEqual([
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
        'output',
      ]);
  });

  test('It can run the builder without publish', async () => {
    mockFs({
      workdir: {},
      output: {},
      'output/Test_PkgName_1.0.1-testversion.pkg.zip': Buffer.from('test content'),
    });

    loadTool.mockResolvedValueOnce('pkgbuilder');
    await buildPackage({
      builderType: 'single',
      binaryVersion: '1.1.1',
      packageName: 'Test_PkgName',
      workingDir: 'workdir',
      outputDir: 'output',
      sourcePaths: __dirname,
      sourceFilePaths: '',
      packageVersion: '1.0.1-testversion',
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      branch: 'develop',
      publishPackage: false,
    });

    expect(loadTool)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec)
      .toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1])
      .toEqual([
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
});
