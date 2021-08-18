const core = require('@actions/core');
const fs = require('fs');
const mvn = require('./mvn');
const { run, checkEnv } = require('../../utils');
const versions = require('../../utils/src/versions');
const loadNexusCredentials = require('./nexus-credentials');

const setVersion = async (version) => core.group(
  `Set version ${version}`,
  async () => mvn.setVersion(version),
);

// Determine if a POM exists. If file argument is given, assume it is valid.
// If none set, look for pom in pwd.
const pomExists = (args) => args.includes('-f ')
  || args.includes('--file=')
  || fs.existsSync('pom.xml');

const action = async () => {
  const args = core.getInput('args', { required: true });
  const version = core.getInput('version');

  const serviceAccountKey = core.getInput('service-account-key') || '';
  const nexusUsernameSecretName = core.getInput('nexus-username-secret-name') || '';
  const nexusPasswordSecretName = core.getInput('nexus-password-secret-name') || '';
  await loadNexusCredentials(serviceAccountKey, nexusUsernameSecretName, nexusPasswordSecretName);

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
};

if (require.main === module) {
  run(action);
}

module.exports = action;
