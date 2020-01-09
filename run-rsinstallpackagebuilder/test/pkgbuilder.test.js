const os = require('os');
const path = require('path');
const fs = require('fs');
const { run } = require('../src/index');

describe('RS installer package tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  test('Run builder on test files', async () => {
    jest.setTimeout(10000);
    const outputDir = path.join(__dirname, '..', 'test_output_dir');
    process.env['INPUT_PACKAGE-NAME'] = 'Test_PkgName';
    process.env['INPUT_BUILDER-TYPE'] = 'single';
    process.env['INPUT_WORKING-DIR'] = os.tmpdir();
    process.env['INPUT_OUTPUT-DIR'] = outputDir;
    process.env['INPUT_SOURCE-PATHS'] = __dirname;
    process.env['INPUT_SOURCE-FILEPATHS'] = '';
    process.env['INPUT_TOOL-VERSION'] = '1.0.0';

    // process.env['NEXUS_USERNAME'] = '';
    // process.env['NEXUS_PASSWORD'] = '';

    await run(); // Should create a package of this file and place it under ../test_output_dir.
    expect(fs.existsSync(path.join(outputDir, 'Test_PkgName.pkg.xml'))).toBe(true);
  });
});
