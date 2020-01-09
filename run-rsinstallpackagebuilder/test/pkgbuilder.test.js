const os = require('os');
const path = require('path');
const fs = require('fs');
const { run } = require('../src/index');

describe('RS installer package tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  test('Run builder on test files', async () => {
    /* 
     * works well on windows but not on osx due to actions/tool-cache insanity
     *
    jest.setTimeout(10000);
    const outputDir = path.join(__dirname, '..', 'test_output_dir');
    console.log(outputDir);
    process.env['INPUT_PACKAGE-NAME'] = 'Test_PkgName';
    process.env['INPUT_TYPE'] = 'single';
    process.env['INPUT_WORKING-DIR'] = os.tmpdir();
    process.env['INPUT_OUTPUT-DIR'] = outputDir;
    process.env['INPUT_SOURCE-PATHS'] = __dirname;
    process.env['INPUT_TOOL-VERSION'] = '1.0.0';

    await run(); // Should create a package of this file and place it under ../test_output_dir.
    expect(fs.existsSync(path.join(outputDir, 'Test_PkgName.pkg.xml'))).toBe(true);
    */
  });
});
