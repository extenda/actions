const os = require('os');
const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');
const { loadTool } = require('../../utils');

const getBinaryName = () => (os.platform() === 'win32' ? 'InstallerPackageBuilder.Core.Console.exe' : 'InstallerPackageBuilder.Core.Console');

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

  if (packageName && builderType !== 'multiple') {
    builderArgs.push('-pn', packageName);
  }

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

  const url = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${getBinaryName()}`;

  return loadTool({
    tool: 'InstallerPackageBuilder.Core.Console',
    binary: getBinaryName(),
    version: binaryVersion,
    downloadUrl: url,
    auth: {
      username: process.env.NEXUS_USERNAME,
      password: process.env.NEXUS_PASSWORD,
    },
  });
};

const publishPackageCommand = async (args) => {
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
  const data = fs.readFileSync(filePath, 'binary');

  core.info(`PublishUrl: ${fullpublishUrl}`);
  core.info(`user: ${process.env.NEXUS_USERNAME}, pass ${process.env.NEXUS_PASSWORD}`);
  return fetch(fullpublishUrl, {
    method: 'PUT',
    body: data,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.NEXUS_USERNAME}:${process.env.NEXUS_PASSWORD}`)
        .toString('base64')}`,
    },
  }).then((response) => {
    if (!response.ok) {
      throw response;
    }
    core.info(`Package published successfully, server responded with ${response.status} ${response.statusText}`);
    return response;
  })
    .catch((err) => {
      core.error(`Failed to publish package, server responded with ${err.status} ${err.statusText}`);
      core.info(`Failed to publish package, server responded with ${err}`);
    });
};

const buildPackage = async (args) => {
  const {
    publishPackage,
    packageVersion,
    outputDir,
    publishUrl,
    branch,
    sourcePaths,
  } = args;

  const buildTool = await downloadBuildTool(args);
  await packageBuilderCommand(buildTool, args);
  if (publishPackage) {
    const fullPath = sourcePaths; // path.join(__dirname, sourcePaths);
    core.info(`Sourcepath fullname: ${fullPath}`);
    const dirs = fs.readdirSync(fullPath)
      .filter((f) => fs.statSync(path.join(fullPath, f)).isDirectory());
    dirs.forEach((dir) => {
      core.info(`DirectoryName: ${dir}`);
      publishPackageCommand({
        packageName: dir,
        packageVersion,
        outputDir,
        publishUrl,
        branch,
      });
    });
  }
  return true;
};

module.exports = {
  buildPackage,
  downloadBuildTool,
  publishPackageCommand,
  packageBuilderCommand,
  getBinaryName,
};
