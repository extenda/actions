import path from 'node:path';

import * as core from '@actions/core';
import * as exec from '@actions/exec';
import os from 'os';

import { loadTool } from '../../utils/src/index.js';

const VSWHERE_VERSION = '2.7.1';

const findMSBuild = async (vswhere) => {
  let msbuild = '';
  const options = {
    listeners: {
      stdout: (data) => {
        msbuild += data.toString();
      },
    },
  };
  await exec.exec(
    vswhere,
    [
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

const action = async () => {
  if (os.platform() !== 'win32') {
    core.setFailed('MSBuild only works on Windows!');
    return;
  }
  await loadTool({
    tool: 'vswhere',
    binary: 'vswhere.exe',
    version: VSWHERE_VERSION,
    downloadUrl: `https://github.com/microsoft/vswhere/releases/download/${VSWHERE_VERSION}/vswhere.exe`,
  })
    .then(findMSBuild)
    .then((msbuild) => {
      core.info(`MSBuild directory '${msbuild}' added to PATH.`);
      return core.addPath(msbuild);
    });
};

export default action;
