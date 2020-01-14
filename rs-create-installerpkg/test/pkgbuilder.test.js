const os = require('os');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');

// Used by @actions/tool-cache. Directory must exist before we load module.
const outputDir = path.join(__dirname, '..', 'test_output_dir');
process.env.RUNNER_TEMP = outputDir;
process.env.RUNNER_TOOL_CACHE = outputDir;

if (!process.env.NEXUS_USERNAME) {
  // eslint-disable-next-line no-console
  console.log('Using local user credentials in test');
  process.env.NEXUS_USERNAME = process.env.GITHUB_USER;
  process.env.NEXUS_PASSWORD = process.env.GITHUB_TOKEN;
}

// Directory must exist for tool-cache.
fsExtra.mkdirs(outputDir);

// We must import pkgbuilder AFTER preparing the environment.
const { buildPackage, downloadBuildTool } = require('../src/pkgbuilder');

jest.setTimeout(30000);

describe('RS installer package tests', () => {
  beforeAll(() => {
    fsExtra.mkdirs(outputDir);
  });

  afterAll(() => {
    fsExtra.removeSync(outputDir);
  });

  test('It downloads the build tool', async () => {
    const tool = await downloadBuildTool({
      binaryVersion: '1.0.0',
    });
    expect(fs.existsSync(tool)).toEqual(true);
  });

  // There's no binary we can test on MacOS
  if (os.platform() !== 'darwin') {
    test('It can run the builder', async () => {
      // Should create a package of this file and place it under ../test_output_dir.
      await buildPackage({
        builderType: 'single',
        binaryVersion: '1.0.0',
        packageName: 'Test_PkgName',
        workingDir: os.tmpdir(),
        outputDir,
        sourcePaths: __dirname,
        sourceFilePaths: '',
      });

      expect(fs.existsSync(path.join(outputDir, 'Test_PkgName.pkg.xml'))).toBe(true);
    });
  }
});
