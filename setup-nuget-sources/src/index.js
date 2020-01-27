const core = require('@actions/core');

const {
  parseNugetSourceJson,
  setNuGetApiKey,
  setNuGetSource,
  generateRegexPattern,
  commentOutSourceUrl,
} = require('./nuget-sources');

const run = async () => {
  try {
    const configFile = core.getInput('config-file', { required: true });
    const sources = parseNugetSourceJson(core.getInput('sources'));

    for (const {
      name, source, username, password, key,
    } of sources) {
      core.info(`Add NuGet source to ${configFile}. Name: ${name}. Path: ${source}. Username: ${username}. Password ${password}. ApiKey: ${key}`);

      const pattern = generateRegexPattern(source);

      const commentedResult = commentOutSourceUrl(configFile, pattern);
      core.debug(`Result of commenting out source if existing: ${commentedResult}`);

      setNuGetSource(configFile, { name, source }, { username, password });
      setNuGetApiKey(configFile, { key, source });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
