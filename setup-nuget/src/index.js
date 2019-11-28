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

const setNuGetSource = async (nuget, configFile, { name, source }, { username, password }) => {
  const args = ['sources', 'update', '-Name', name, '-Source', source];
  if (username && password) {
    args.push('-username', username, '-password', password);
  }
  args.push('-ConfigFile', configFile);
  return exec.exec(nuget, args);
};

const setNuGetApiKey = async (nuget, configFile, { key, source }) => exec.exec(nuget,
  ['setapikey', key, '-source', source, '-ConfigFile', configFile, '-NonInteractive']);

const run = async () => {
  if (os.platform() !== 'win32') {
    core.setFailed('nuget.exe only works on Windows!');
    return;
  }
  try {
    checkEnv(['NUGET_USERNAME', 'NUGET_PASSWORD', 'NUGET_API_KEY']);

    const configFile = core.getInput('config-file', { required: true });
    const sources = JSON.parse(core.getInput('sources') || '[]');

    const nuget = await loadTool({
      tool: 'nuget',
      binary: 'nuget.exe',
      version: '0.0.1-latest', // Version must be semver and 'latest' is not.
      downloadUrl: 'https://dist.nuget.org/win-x86-commandline/latest/nuget.exe',
    });

    addToPath(nuget);

    const nexusAuth = {
      username: process.env.NUGET_USERNAME,
      password: process.env.NUGET_PASSWORD,
    };

    for (const { name, source, auth } of sources) {
      core.info(`Update NuGet source ${name}`);
      // eslint-disable-next-line no-await-in-loop
      await setNuGetSource(nuget, configFile, { name, source }, auth ? nexusAuth : undefined);
    }

    const nexusHosted = 'https://repo.extendaretail.com/repository/nuget-hosted/';
    await setNuGetApiKey(nuget, configFile, {
      key: process.env.NUGET_API_KEY,
      source: nexusHosted,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
