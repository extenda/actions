const core = require('@actions/core');
const exec = require('@actions/exec');

const setNuGetSource = async (nuget, configFile, { name, source }, { username, password }) => {
  const args = ['sources', 'update', '-Name', name, '-Source', source];
  if (username && password) {
    args.push('-username', username, '-password', password);
  }
  args.push('-ConfigFile', configFile);
  return exec.exec(nuget, args);
};

const setNuGetApiKey = async (nuget, configFile, { key, source }) => exec.exec(
  nuget,
  [
    'setapikey', key,
    '-source', source,
    '-ConfigFile', configFile,
    '-NonInteractive',
  ],
);

const parseNugetSourceJson = async (sourcesJson) => {
  // TODO: add try catch and log
  const sources = JSON.parse(sourcesJson || '[]');
  return sources;
};

const commentOutSourceUrl = (url) => {
  core.info(`Trying to comment out existing url: ${url}`);
};

const generateRegexPattern = (url) => {
  core.info(`Generating regex for ${url}`);
};

module.exports = {
  setNuGetSource,
  setNuGetApiKey,
  parseNugetSourceJson,
  commentOutSourceUrl,
  generateRegexPattern,
};
