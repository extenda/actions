const mockFs = require('mock-fs');

jest.mock('@actions/core');
jest.mock('@actions/exec');
let fs = require('fs');
const exec = require('@actions/exec');
const deployDocumentation = require('../src/redoc');

// Make sure we get a mocked FS.
fs = require('fs');

describe('Run redoc deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  test('It can run the action and the files are generated', async () => {
    mockFs({});
    await deployDocumentation('yamlfile', 'apiName', 'version', 'bucket', 'systemName');

    expect(fs.existsSync('Versionsindex.html')).toEqual(true);
    expect(fs.existsSync('APIsindex.html')).toEqual(true);
    expect(fs.existsSync('Systemsindex.html')).toEqual(true);
    expect(exec.exec).toHaveBeenCalledTimes(12);
  });
});
