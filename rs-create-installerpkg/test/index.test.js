jest.mock('@actions/core');
jest.mock('../src/pkgbuilder.js');

import * as core from '@actions/core';

import action from '../src/index.js';
import { buildPackage } from '../src/pkgbuilder.js';

const orgEnv = process.env;

describe('create packaage Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      NEXUS_USERNAME: 'test',
      NEXUS_PASSWORD: 'pwd',
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  // test('It fails for missing NEXUS_USERNAME', async () => {
  //   delete process.env.NEXUS_USERNAME;
  //   await expect(action()).rejects.toEqual(new Error('Missing env var: NEXUS_USERNAME'));
  // });

  // test('It fails for missing NEXUS_PASSWORD', async () => {
  //   delete process.env.NEXUS_PASSWORD;
  //   await expect(action()).rejects.toEqual(new Error('Missing env var: NEXUS_PASSWORD'));
  // });

  test('It will use passed inputs', async () => {
    core.getInput
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('1.1.0')
      .mockReturnValueOnce('develop')
      .mockReturnValueOnce('single')
      .mockReturnValueOnce('output')
      .mockReturnValueOnce('Test_PkgName')
      .mockReturnValueOnce('1.0.1-testversion')
      .mockReturnValueOnce(
        'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce(__dirname)
      .mockReturnValueOnce('workdir');

    await action();
    expect(buildPackage).toHaveBeenCalledWith({
      binaryVersion: '1.1.0',
      branch: 'develop',
      builderType: 'single',
      outputDir: 'output',
      packageName: 'Test_PkgName',
      packageVersion: '1.0.1-testversion',
      publishPackage: true,
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      sourceFilePaths: '',
      sourcePaths: __dirname,
      workingDir: 'workdir',
    });
  });

  test('Without publish package defined', async () => {
    core.getInput
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce('1.1.0')
      .mockReturnValueOnce('develop')
      .mockReturnValueOnce('single')
      .mockReturnValueOnce('output')
      .mockReturnValueOnce('Test_PkgName')
      .mockReturnValueOnce('1.0.1-testversion')
      .mockReturnValueOnce(
        'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      )
      .mockReturnValueOnce('')
      .mockReturnValueOnce(__dirname)
      .mockReturnValueOnce('workdir');

    await action();
    expect(buildPackage).toHaveBeenCalledWith({
      binaryVersion: '1.1.0',
      branch: 'develop',
      builderType: 'single',
      outputDir: 'output',
      packageName: 'Test_PkgName',
      packageVersion: '1.0.1-testversion',
      publishPackage: false,
      publishUrl: 'https://repo.extendaretail.com/repository/raw-hosted/RS/',
      sourceFilePaths: '',
      sourcePaths: __dirname,
      workingDir: 'workdir',
    });
  });
});
