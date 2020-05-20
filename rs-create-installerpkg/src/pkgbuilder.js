const os = require('os');
const exec = require('@actions/exec');
const core = require('@actions/core');
const fetch = require('node-fetch');
const { createReadStream } = require('fs');
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

  const builderArgs = [];

  builderArgs.push(builderType);
  builderArgs.push('-pn', packageName);
  builderArgs.push('-wd', workingDir);
  builderArgs.push('-od', outputDir);
  builderArgs.push('-pv', packageVersion);

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

const publishPackage = async (args) => {
  const {
    packageName,
    packageVersion,
    publishUrl,
    branch,
  } = args;

  const packageUrl = `${packageName}.pkg/${branch}/${packageName}.pkg.${packageVersion}.zip`;
  const fullpublishUrl = `${publishUrl}${packageUrl}`;
  const filePath = `installpackages/${packageName}${packageVersion}.pkg.zip`;
  const stream = createReadStream(filePath);

  const headerProperties = {
    Authorization: `Basic ${Buffer.from(`${process.env.NEXUS_USERNAME}:${process.env.NEXUS_PASSWORD}`).toString('base64')}`,
  };
  fetch(fullpublishUrl, { method: 'POST', body: stream, headers: headerProperties })
    .then((res) => core.info(`Post installer package returned status${res.status}`));
};

const buildPackage = async (args) => {
  const buildTool = await downloadBuildTool(args);
  await packageBuilderCommand(buildTool, args);
  const publishResult = await publishPackage(args);
  return publishResult;
};

module.exports = {
  buildPackage,
  downloadBuildTool,
  publishPackage,
};
