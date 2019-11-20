const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const os = require('os');
const path = require('path');

const VSWHERE_VERSION = '2.7.1';
const VSWHERE = 'vswhere';
const VSWHERE_EXE = 'vswhere.exe';

const findVSWhere = async () => Promise.resolve(tc.find(VSWHERE, VSWHERE_VERSION))
  .then(dir => dir ? path.join(dir, VSWHERE_EXE) : '');

const downloadVSWhereIfMissing = async (vswhere) => {
  if (!vswhere) {
    core.info(`Downloading VSWhere ${VSWHERE_VERSION}`);
    const downloadUuid = await tc.downloadTool(`https://github.com/microsoft/vswhere/releases/download/${VSWHERE_VERSION}/${VSWHERE_EXE}`);
    const tmpDir = path.dirname(downloadUuid);
    const tmpFile = path.join(tmpDir, VSWHERE_EXE);
    await io.cp(downloadUuid, tmpFile);
    await tc.cacheDir(tmpDir, VSWHERE, VSWHERE_VERSION);
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

  return path.dirname(msbuild);
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
        return core.addPath(msbuild);
      });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
