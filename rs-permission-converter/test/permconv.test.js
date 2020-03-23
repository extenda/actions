const os = require('os');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const exec = require('@actions/exec');

// Used by @actions/tool-cache. Directory must exist before we load module.
const outputDir = path.join(__dirname, '..', 'test_output_dir');

if (!process.env.NEXUS_USERNAME) {
  // eslint-disable-next-line no-console
  console.log('Using local user credentials in test');
  process.env.NEXUS_USERNAME = process.env.GITHUB_USER;
  process.env.NEXUS_PASSWORD = process.env.GITHUB_TOKEN;
}

// Directory must exist for tool-cache.
fsExtra.mkdirs(outputDir);

// We must import pkgbuilder AFTER preparing the environment.
const { convertPermissions, downloadPermConvTool } = require('../src/permconv');

jest.setTimeout(30000);

jest.mock('@actions/exec');
describe('RS Permission Converter Tests', () => {
  beforeAll(() => {
    fsExtra.mkdirs(outputDir);
  });

  afterAll(() => {
    fsExtra.removeSync(outputDir);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It downloads the build tool', async () => {
    const tool = await downloadPermConvTool({
      binaryVersion: '1.0.0',
    });
    expect(fs.existsSync(tool)).toEqual(true);
  });

  // There's no binary we can test on MacOS
  if (os.platform() !== 'darwin') {
    test('the permission converter is called correctly for sql', async () => {
      await convertPermissions({
        binaryVersion: '1.0.0',
        type: 'sql',
        workDir: '/workDir',
        permFile: 'permFile',
        sqlFile: 'sqlFile',
      });
      expect(exec.exec.mock.calls[0][1]).toEqual(['sql', '-w /workDir', '-p permFile', '-s sqlFile']);
    });

    test('the permission converter is called correctly for resx', async () => {
      await convertPermissions({
        binaryVersion: '1.0.0',
        type: 'resx',
        workDir: '/workDir',
        permFile: 'permFile',
        outputDir: 'outputDir',
      });
      expect(exec.exec.mock.calls[0][1]).toEqual(['resx', '-w /workDir', '-p permFile', '--output-folder outputDir']);
    });
  }
});
