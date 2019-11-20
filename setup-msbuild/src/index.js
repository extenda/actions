const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const os = require('os');
const path = require('path');

const VSWHERE_VERSION = '2.7.1';

const findVSWhere = async () => tc.find('vswhere', VSWHERE_VERSION);

const downloadVSWhereIfMissing = async (vswhere) => {
  if (!vswhere) {
    core.info(`Downloading VSWhere ${VSWHERE_VERSION}`);
    const download = await tc.downloadTool(`https://github.com/microsoft/vswhere/releases/download/${VSWHERE_VERSION}/vswhere.exe`);
    await tc.cacheFile(download, 'vswhere.exe', 'vswhere', VSWHERE_VERSION);
    return findVSWhere();
  }
  return vswhere;
};

const findMSBuild = async (vswhere) => {
  let msbuild = '';
  const options = {
    listeners: {
      stdout: (data) => {
        msbuild += data.toString();
      },
    },
  };
  await exec.exec(vswhere, [
      '-latest',
      '-requires',
      'Microsoft.Component.MSBuild',
      '-find',
      'MSBuild\\**\\Bin\\MSBuild.exe',
    ],
    options,
  );

  if (!msbuild) {
    throw new Error('Failed to find MSBuild.exe');
  }

  return msbuild;
};

const run = async () => {
  if (os.platform() !== 'win32') {
    core.setFailed('MSBuild only works on Windows!');
    return;
  }
  try {
    await findVSWhere()
      .then(downloadVSWhereIfMissing)
      .then(findMSBuild)
      .then(msbuild => {
        core.info(`MSBuild directory '${msbuild}' added to PATH.`);
        return core.addPath(path.dirname(msbuild));
      });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
