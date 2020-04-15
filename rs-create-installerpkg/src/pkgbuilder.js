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
    packageVersion,
  } = args;

  let builderArgs = [
    builderType,
    '-pn', packageName,
    '-wd', workingDir,
    '-od', outputDir,
    '-pv', packageVersion,
  ];

  if (sourcePaths) {
      builderArgs.push('-sp', sourcePaths);
  }
  
  if (sourceFilePaths) {
    builderArgs.push('-sfp', sourceFilePaths);
  }

  return exec.exec(
    builder,
    builderArgs,
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
    auth: {
      username: process.env.NEXUS_USERNAME,
      password: process.env.NEXUS_PASSWORD,
    },
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
