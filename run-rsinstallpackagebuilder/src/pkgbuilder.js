const os = require('os');
const exec = require('@actions/exec');
const { loadTool } = require('../../utils');

const BINARY_NAME = os.platform() !== 'win32'
  ? 'InstallerPackageBuilder.Core.Console'
  : 'InstallerPackageBuilder.Core.Console.exe';

const packageBuilderCommand = async (builder, args) => {
  const {
    builderType,
    packageName,
    workingDir,
    outputDir,
    sourcePaths,
    sourceFilePaths,
  } = args;

  return exec.exec(
    builder,
    [
      builderType,
      '-pn', packageName,
      '-wd', workingDir,
      '-od', outputDir,
      '-sp', sourcePaths,
      '-sfp', sourceFilePaths,
    ],
  );
};

const downloadBuildTool = async (args) => {
  const appName = 'RS.InstallerPackageBuilder.Core.Console';
  const { binaryVersion } = args;

  const url = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${BINARY_NAME}`;

  return loadTool({
    tool: 'InstallerPackageBuilder.Core.Console',
    binary: BINARY_NAME,
    version: binaryVersion,
    downloadUrl: url,
  });
};

const buildPackage = async (args) => {
  const buildTool = await downloadBuildTool(args);
  return packageBuilderCommand(buildTool, args);
};

module.exports = {
  buildPackage,
  downloadBuildTool,
};
