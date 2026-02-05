import * as core from '@actions/core';
import * as exec from '@actions/exec';
import replace from 'replace-in-file';

const setNuGetSource = async (
  configFile,
  { name, source },
  { username, password },
) => {
  const args = ['sources', 'add', '-Name', name, '-Source', source];
  if (username && password) {
    core.info('Username and Password is being used when setting source');
    args.push(
      '-Username',
      username,
      '-Password',
      password,
      '-StorePasswordInClearText',
    );
  }
  args.push('-ConfigFile', configFile);
  return exec.exec('nuget', args);
};

const setNuGetApiKey = async (configFile, { apikey, source }) => {
  const args = [
    'setapikey',
    apikey,
    '-source',
    source,
    '-ConfigFile',
    configFile,
    '-NonInteractive',
  ];
  return exec.exec('nuget', args);
};

const parseNugetSourceJson = (sourcesJson) => {
  const sources = JSON.parse(sourcesJson || '[]');
  return sources;
};

const commentOutSourceUrl = async (nugetFileFullPath, regex) => {
  core.debug(`Trying to comment out existing urls with regex: ${regex}`);

  const options = {
    files: `${nugetFileFullPath}`,
    from: regex,
    to: (match) => `<!--${match}-->`,
  };

  return replace(options);
};

const generateRegexPattern = (url) => {
  try {
    core.debug(`Generating regex for ${url}`);
    let escapedUrl = url;
    escapedUrl = escapedUrl.replace(/\//g, '\\/');

    const regex = new RegExp(`^\\s*(.*"${escapedUrl}/?"\\s*\\/>)$`, 'gm');
    core.debug(`Regex created ${regex}`);
    return regex;
  } catch (error) {
    core.debug(error.message);
    return null;
  }
};

export {
  commentOutSourceUrl,
  generateRegexPattern,
  parseNugetSourceJson,
  setNuGetApiKey,
  setNuGetSource,
};
