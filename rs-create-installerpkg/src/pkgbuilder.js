const os = require('os');
const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs');
const request = require('request');
const path = require('path')
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
    outputDir,
    publishUrl,
    branch,
  } = args;

  const packageUrl = `${packageName}.pkg/${branch}/${packageName}.pkg.${packageVersion}.zip`;
  const fullpublishUrl = `${publishUrl}${packageUrl}`;
  const filePath = `${outputDir}${path.sep}${packageName}_${packageVersion}.pkg.zip`;
  const data = await fs.createReadStream(filePath);

  // const headerProperties = {
  //   Authorization: `Basic ${Buffer.from(`${process.env.NEXUS_USERNAME}:
  // ${process.env.NEXUS_PASSWORD}`).toString('base64')}`,
  // };
  request({
    url: fullpublishUrl,
    method: 'POST',
    headers: {
      'cache-control': 'no-cache',
      'content-disposition': `attachment; filename=${filePath}`,
      'content-type': 'image/jpg',
      authorization: `Basic ${Buffer.from(`${process.env.NEXUS_USERNAME}:${process.env.NEXUS_PASSWORD}`).toString('base64')}`,
    },
    encoding: null,
    body: data,
  }, (error, response) => {
    if (error) {
      core.info(`Post installer package returned status ${response.statusCode} ${error}`);
    }
    else {
      core.info(`Post installer package returned status ${response.statusCode}`);
    }
  });
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
