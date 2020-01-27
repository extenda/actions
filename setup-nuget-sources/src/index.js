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

    core.debug('Parsing nuget source JSON - PENDING');
    const sources = parseNugetSourceJson(core.getInput('sources'));
    core.debug('Parsing nuget source JSON - SUCCESS');

    for (const {
      name, source, username, password, apikey,
    } of sources) {
      core.info(`Add NuGet source to ${configFile}. Name: ${name}. Path: ${source}. Username: ${username}. Password ${password}. ApiKey: ${apikey}`);

      core.debug('Generating regex pattern - PENDING');
      const pattern = generateRegexPattern(source);
      core.debug('Generating regex pattern - SUCCESS');

      core.debug('Commenting out existing nuget source - PENDING');
      const commentedResult = commentOutSourceUrl(configFile, pattern);
      core.debug('Commenting out existing nuget source - SUCCESS');
      core.debug(`Result of commenting out source if existing: ${commentedResult}`);

      core.debug('Set nuget source - PENDING');
      setNuGetSource(configFile, { name, source }, { username, password });
      core.debug('Set nuget source - SUCCESS');

      core.debug('Set nuget source api-key - PENDING');
      setNuGetApiKey(configFile, { apikey, source });
      core.debug('Set nuget source api-key - SUCCESS');
    }
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
};

run();
