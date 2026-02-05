import * as core from '@actions/core';

import {
  commentOutSourceUrl,
  generateRegexPattern,
  parseNugetSourceJson,
  setNuGetApiKey,
  setNuGetSource,
} from './nuget-sources.js';

const run = async () => {
  try {
    const configFile = core.getInput('config-file', { required: true });

    core.info('Parsing nuget source JSON - PENDING');
    const sources = parseNugetSourceJson(core.getInput('sources'));
    core.info('Parsing nuget source JSON - SUCCESS');
    core.info(`sources JSON: ${JSON.stringify(sources)}`);

    for (const { name, source, username, password, apikey } of sources) {
      core.info(
        `Add NuGet source to ${configFile}. Name: ${name}. Path: ${source}. Username: ${username}. Password ${password}. ApiKey: ${apikey}`,
      );

      core.info('Generating regex pattern - PENDING');
      const pattern = generateRegexPattern(source);
      if (!pattern) {
        throw new Error(`Could not generate regex pattern for ${source}`);
      }
      core.info('Generating regex pattern - SUCCESS');

      core.info('Commenting out existing nuget source - PENDING');
      const commentedResult = await commentOutSourceUrl(configFile, pattern);
      core.info(
        `Commenting out existing nuget source result: ${JSON.stringify(commentedResult)}`,
      );

      core.info('Set nuget source - PENDING');
      await setNuGetSource(
        configFile,
        { name, source },
        { username, password },
      );
      core.info('Set nuget source - SUCCESS');

      if (apikey) {
        core.info('Set nuget source api-key - PENDING');
        await setNuGetApiKey(configFile, { apikey, source });
        core.info('Set nuget source api-key - SUCCESS');
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
