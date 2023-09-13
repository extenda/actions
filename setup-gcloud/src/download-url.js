const os = require('os');

const platforms = {
  linux: {
    platform: 'linux',
    extension: 'tar.gz',
  },
  darwin: {
    platform: 'darwin',
    extension: 'tar.gz',
  },
  win32: {
    platform: 'windows',
    extension: 'zip',
  },
};

const getDownloadUrl = (version) => {
  const arch = os.arch() === 'x64' ? 'x86_64' : os.arch();
  if (!platforms[os.platform()]) {
    throw new Error(`Unsupported platform ${os.platform()}`);
  }

  const { platform, extension } = platforms[os.platform()];
  return `https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-${version}-${platform}-${arch}.${extension}`;
};

module.exports = getDownloadUrl;
