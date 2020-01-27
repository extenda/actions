const core = require('@actions/core');
const { parseNugetSourceJson, setNuGetApiKey, setNuGetSource } = require('./nuget-sources');

const run = async () => {
  try {
    const configFile = core.getInput('config-file', { required: true });
    const sources = parseNugetSourceJson(core.getInput('sources'));

    for (const {
      name, source, username, password, apikey,
    } of sources) {
      core.info(`Update NuGet source ${name}`);
      core.info()
      // eslint-disable-next-line no-await-in-loop
      setNuGetSource(nuget, configFile, { name, source }, auth ? nexusAuth : undefined);
      setNuGetApiKey(nuget, configFile, {
        key: process.env.NUGET_API_KEY,
        source: nexusHosted,
      });
    }

    const nexusHosted = 'https://repo.extendaretail.com/repository/nuget-hosted/';
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
