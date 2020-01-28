const core = require('@actions/core');
const exec = require('@actions/exec');
const replace = require('replace-in-file');

const setNuGetSource = async (configFile, { name, source }, { username, password }) => {
  const args = ['sources', 'add', '-Name', name, '-Source', source];
  if (username && password) {
    args.push('-username', username, '-password', password, '-StorePasswordInClearText');
  }
  args.push('-ConfigFile', configFile);
  return exec.exec('nuget', args);
};

const setNuGetApiKey = async (configFile, { apikey, source }) => exec.exec(
  'nuget',
  [
    'setapikey', apikey,
    '-source', source,
    '-ConfigFile', configFile,
    '-NonInteractive',
  ],
);

const parseNugetSourceJson = (sourcesJson) => {
  // TODO: add try catch and log
  const sources = JSON.parse(sourcesJson || '[]');
  return sources;
};

const commentOutSourceUrl = async (nugetFileFullPath, regex) => {
  core.info(`Trying to comment out existing urls with regex: ${regex}`);

  const options = {
    files: `${nugetFileFullPath}`,
    from: regex,
    to: (match) => `<!--${match}-->`,
  };

  return replace(options);
};

const generateRegexPattern = (url) => {
  core.info(`Generating regex for ${url}`);

  try {
    let escapedUrl = url;
    if (escapedUrl.substr(-1) !== '/') {
      escapedUrl += '/';
    }

    escapedUrl = escapedUrl.replace(/\//g, '\\/');

    const regex = new RegExp(`^\\s*(.*"${escapedUrl}/?"\\s*\\/>)$`, 'gm');
    core.debug(`Regex created ${regex}`);
    return regex;
  } catch (error) {
    core.error('Error occurred:', error);
    return null;
  }
};

module.exports = {
  setNuGetSource,
  setNuGetApiKey,
  parseNugetSourceJson,
  commentOutSourceUrl,
  generateRegexPattern,
};
