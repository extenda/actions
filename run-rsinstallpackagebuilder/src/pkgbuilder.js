const os = require('os');
const { loadTool } = require('../../utils');

const getBinaryName = async () => {
  let binaryName = '';

  if (os.platform() !== 'win32') {
    binaryName = 'InstallerPackageBuilder.Core.Console';
  } else {
    binaryName = 'InstallerPackageBuilder.Core.Console.exe';
  }

  return binaryName;
};

const getBuilder = async (appName, binaryVersion) => {
  const binaryName = getBinaryName();
  const downloadUrlNexus = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${binaryName}`;

  const builder = await loadTool({
    tool: 'InstallerPackageBuilder.Core.Console',
    binary: binaryName,
    version: binaryVersion, // Version must be semver and 'latest' is not.
    downloadUrl: downloadUrlNexus,
  });

  return builder;
};

module.exports = {
  getBinaryName,
  getBuilder,
};
