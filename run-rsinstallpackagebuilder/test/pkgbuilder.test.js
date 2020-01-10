const os = require('os');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');

// Used by @actions/tool-cache. Directory must exist before we load module.
const outputDir = path.join(__dirname, '..', 'test_output_dir');
process.env.RUNNER_TEMP = outputDir;
process.env.RUNNER_TOOL_CACHE = outputDir;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const buildPackage = require('../src/pkgbuilder');

jest.setTimeout(30000);

describe('RS installer package tests', () => {
  test('Run builder on test files', async () => {
    fsExtra.removeSync(outputDir);
    fs.mkdirSync(outputDir);

    if (!process.env.NEXUS_USERNAME) {
      console.log('Using local user credentials in test');
      process.env.NEXUS_USERNAME = process.env.GITHUB_USER;
      process.env.NEXUS_PASSWORD = process.env.GITHUB_TOKEN;
    }

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
});
