const os = require('os');
const core = require('@actions/core');
const exec = require('@actions/exec');
const { loadTool } = require('../../utils');

const BINARY_NAME = os.platform() !== 'win32'
  ? 'PermissionConverter'
  : 'PermissionConverter.exe';

const permissionConvCommand = async (converter, args) => {
  const params = [];
  params.push(args.type);
  params.push(`-w ${args.workDir}`);
  params.push(`-p ${args.permFile}`);
  if (args.type === 'sql') {
    params.push(`-s ${args.sqlFile}`);
  } else if (args.type === 'resx') {
    params.push(`--output-folder ${args.outputDir}`);
  }
  core.info('Running permission converter');
  return exec.exec(converter, params);
};

const downloadPermConvTool = async (args) => {
  core.info('Downloading permission converter tool');
  const appName = 'RS.PermissionConverter';
  const { binaryVersion } = args;

  const url = `https://repo.extendaretail.com/repository/raw-hosted/${appName}/${binaryVersion}/${BINARY_NAME}`;

  return loadTool({
    tool: 'PermissionConverter',
    binary: BINARY_NAME,
    version: binaryVersion,
    downloadUrl: url,
    auth: {
      username: process.env.NEXUS_USERNAME,
      password: process.env.NEXUS_PASSWORD,
    },
  });
};

const convertPermissions = async (args) => {
  const permTool = await downloadPermConvTool(args);
  return permissionConvCommand(permTool, args);
};

module.exports = {
  convertPermissions,
  downloadPermConvTool,
};
