jest.mock('os');

const os = require('os');
const getDownloadUrl = require('../src/download-url');

describe('Get gcloud download URL', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('It can create a Windows URL', async () => {
    os.platform.mockReturnValue('win32');
    os.arch.mockReturnValue('x86_64');

    const url = getDownloadUrl('282.0.0');
    expect(url).toEqual('https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-282.0.0-windows-x86_64.zip');
  });

  test('It can create a MacOS URL', async () => {
    os.platform.mockReturnValue('darwin');
    os.arch.mockReturnValue('x64');

    const url = getDownloadUrl('282.0.0');
    expect(url).toEqual('https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-282.0.0-darwin-x86_64.tar.gz');
  });

  test('It can create a Linux URL', async () => {
    os.platform.mockReturnValue('linux');
    os.arch.mockReturnValue('x86_64');

    const url = getDownloadUrl('282.0.0');
    expect(url).toEqual('https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-282.0.0-linux-x86_64.tar.gz');
  });

  test('It throws error for unsupported platforms', async () => {
    os.platform.mockReturnValue('aix');
    os.arch.mockReturnValue('x86_64');
    expect(() => getDownloadUrl('282.0.0')).toThrow('Unsupported platform aix');
  });
});
