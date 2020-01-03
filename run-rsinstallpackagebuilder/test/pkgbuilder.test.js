const os = require('os');

jest.mock('os');

const { getBinaryName /* , getBuilder */ } = require('../src/pkgbuilder');

// const binaryVersion = 'v1.0.0';
// const appName = 'RS.InstallerPackageBuilder.Core.Console';

describe('RS installer package tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('Windows platform', () => {
    test('Get binary name for win32', async () => {
      os.platform.mockImplementation(() => 'win32');
      const binaryName = await getBinaryName();
      expect(binaryName).toEqual('InstallerPackageBuilder.Core.Console.exe');
    });

    // TODO: Cannot get this test to validate the response from getbuilder.
    // test('Get installer package builder for win32', async () => {
    //   os.platform.mockImplementation(() => 'win32');
    //   const builder = await getBuilder(appName, binaryVersion);
    //   expect(builder).toEqual(null);
    // });
  });

  describe('Linux platform', () => {
    test('Get binary name for linux', async () => {
      os.platform.mockImplementation(() => 'linux');
      const binaryName = await getBinaryName();
      expect(binaryName).toEqual('InstallerPackageBuilder.Core.Console');
    });
  });
});
