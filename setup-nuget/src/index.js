const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require('os');
const path = require('path');
const { checkEnv, loadTool } = require('../../utils');

const addToPath = (nuget) => {
  const nugetDir = path.dirname(nuget);
  core.info(`NuGet directory '${nugetDir}' added to PATH.`);
  core.addPath(nugetDir);
};

const setNuGetSource = async (nuget, { name, source }, { username, password }) => {
  let args = ['sources', 'update', '-Name', name, '-Source', source];
  if (username && password) {
    args.push('-username', username, '-password', password);
  }
  return exec.exec(nuget, args);
};

const setNuGetApiKey = async (nuget, { key, source }) => exec.exec(nuget,
  ['setapikey', key, '-source', source, '-ConfigFile', 'NuGet.config', '-NonInteractive'],
);

const run = async () => {
  if (os.platform() !== 'win32') {
    core.setFailed('MSBuild only works on Windows!');
    return;
  }
  try {
    checkEnv(['NUGET_USERNAME', 'NUGET_PASSWORD', 'NUGET_API_KEY']);

    const nuget = await loadTool({
      tool: 'nuget',
      binary: 'nuget.exe',
      version: 'latest',
      downloadUrl: 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe',
    });

    addToPath(nuget);

    const nexusGroup = 'https://repo.extendaretail.com/repository/nuget-group/';
    const nexusAuth = { username: process.env.NUGET_USERNAME, password: process.env.NUGET_PASSWORD };

    // TODO Do not proxy nuget.org
    await setNuGetSource(nuget, { name: 'nuget.org-proxy', source: nexusGroup }, nexusAuth);
    await setNuGetSource(nuget, { name: 'RS (Nexus)', source: nexusGroup }, nexusAuth);

    const nexusHosted = 'https://repo.extendaretail.com/repository/nuget-hosted/';
    await setNuGetApiKey(nuget, { key: process.env.NUGET_API_KEY, source: nexusHosted });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
