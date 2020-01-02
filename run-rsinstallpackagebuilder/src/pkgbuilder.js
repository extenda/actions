const os = require('os');

const getBinaryName = async () => {
  let binaryName = '';

  if (os.platform() !== 'win32') {
    binaryName = 'InstallerPackageBuilder.Core.Console';
  } else {
    binaryName = 'InstallerPackageBuilder.Core.Console.exe';
  }

  return binaryName;
};

module.exports = {
  getBinaryName,
};
