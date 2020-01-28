const core = require('@actions/core');

const {
  parseNugetSourceJson,
  // setNuGetApiKey,
  setNuGetSource,
  // generateRegexPattern,
  // commentOutSourceUrl,
} = require('./nuget-sources');

const run = async () => {
  try {
    const configFile = core.getInput('config-file', { required: true });

    core.info('Parsing nuget source JSON - PENDING');
    const sources = parseNugetSourceJson(core.getInput('sources'));
    core.info('Parsing nuget source JSON - SUCCESS');
    core.info(`sources JSON: ${JSON.stringify(sources)}`);

    // for (const {
    //   name, source, username, password, apikey,
    // } of sources) {
    sources.array.forEach(async (element) => {
      // core.info(`Add NuGet source to ${configFile}. Name: ${element.name}.
      // Path: ${element.source}.
      // Username: ${element.username}. Password ${element.password}. ApiKey: ${element.apikey}`);

      const {
        name,
        source,
        username,
        password,
        apikey,
      } = element;
      core.info(configFile);
      core.info(name);
      core.info(source);
      core.info(username);
      core.info(password);
      core.info(apikey);

      await setNuGetSource(configFile, { name, source }, { username, password });
      // core.info('Generating regex pattern - PENDING');
      // const pattern = generateRegexPattern(element.source);
      // core.info('Generating regex pattern - SUCCESS');

      // core.info('Commenting out existing nuget source - PENDING');
      // const commentedResult = commentOutSourceUrl(configFile, pattern);
      // core.info('Commenting out existing nuget source - SUCCESS');
      // core.info(`Result of commenting out source if existing: ${commentedResult}`);

      // core.info('Set nuget source - PENDING');
      // // eslint-disable-next-line no-await-in-loop
      // await setNuGetSource(configFile, { element.name, source }, { username, password });
      // core.info('Set nuget source - SUCCESS');

      // if (apikey) {
      //   core.info('Set nuget source api-key - PENDING');
      //   // eslint-disable-next-line no-await-in-loop
      //   await setNuGetApiKey(configFile, { element.apikey, source });
      //   core.info('Set nuget source api-key - SUCCESS');
      // }
    });
  } catch (error) {
    core.debug(error);
    core.setFailed(error.message);
  }
};

run();
