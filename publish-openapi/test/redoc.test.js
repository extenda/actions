jest.mock('@actions/core');
jest.mock('@actions/exec');
const mockFs = require('mock-fs');
const exec = require('@actions/exec');
const deployDocumentation = require('../src/redoc');


describe('Run redoc deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  test('It can run the action', async () => {
    mockFs({});
    await deployDocumentation('yamlfile', 'apiName', 'version', 'bucket', 'systemName');

    expect(exec.exec).toHaveBeenCalledTimes(12);
  });
});
