const core = require('@actions/core');
const fs = require('fs');
const mvn = require('./mvn');
const { checkEnv, versions } = require('../../utils');

const setVersion = async (version) => core.group(
  `Set version ${version}`,
  async () => mvn.setVersion(version));

// Determine if a POM exists. If file argument is given, assume it is valid. If none set, look for pom in pwd.
const pomExists = (args) =>  args.contains('-f ') || args.contains('--file=') || fs.existsSync('pom.xml');

const run = async() => {
  const args = core.getInput('args', { required: true });
  const version = core.getInput('version');
  try {
    checkEnv(['NEXUS_USERNAME', 'NEXUS_PASSWORD']);

    const hasPom = pomExists(args);

    if (!process.env.MAVEN_INIT) {
      await mvn.copySettings();
      core.exportVariable('MAVEN_INIT', 'true');
      if (!version && hasPom) {
        await versions.getBuildVersion('-SNAPSHOT').then(setVersion);
      }
    }

    if (hasPom && version && version !== 'pom.xml') {
      await setVersion(version);
    }

    await mvn.run(args);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
