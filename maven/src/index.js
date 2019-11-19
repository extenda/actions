const core = require('@actions/core');
const mvn = require('./mvn');
const { checkEnv, versions } = require('../../utils');

const setVersion = async (version) => core.group(
  `Set version ${version}`,
  async () => mvn.setVersion(version));

const run = async() => {
  const args = core.getInput('args', { required: true });
  const version = core.getInput('version');
  try {
    checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    if (!process.env.MAVEN_INIT) {
      await mvn.copySettings();
      core.exportVariable('MAVEN_INIT', 'true');
      if (!version) {
        await versions.getBuildVersion('-SNAPSHOT').then(setVersion);
      }
    }

    if (version) {
      await setVersion(version);
    }

    await mvn.run(args);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
