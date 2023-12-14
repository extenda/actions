const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const mvn = require('./mvn');
const { run } = require('../../utils');
const versions = require('../../utils/src/versions');
const loadNexusCredentials = require('./nexus-credentials');

const setVersion = async (version, workingDir = './') => core.group(
  `Set version ${version} (working directory ${workingDir})`,
  async () => mvn.setVersion(version, workingDir),
);

// Determine if a POM exists. If file argument is given, assume it is valid.
// If none set, look for pom in pwd.
const pomExists = (args, workingDir = './') => args.includes('-f ')
  || args.includes('--file=')
  || fs.existsSync(path.join(workingDir, 'pom.xml'));

const action = async () => {
  const args = core.getInput('args', { required: true });
  const version = core.getInput('version');
  const serviceAccountKey = core.getInput('service-account-key') || '';
  const nexusUsernameSecretName = core.getInput('nexus-username-secret-name') || '';
  const nexusPasswordSecretName = core.getInput('nexus-password-secret-name') || '';
  const workingDir = core.getInput('working-directory');

  await loadNexusCredentials(serviceAccountKey, nexusUsernameSecretName, nexusPasswordSecretName);

  const hasPom = pomExists(args, workingDir);

  if (!process.env.MAVEN_INIT) {
    await mvn.copySettings();
    core.exportVariable('MAVEN_INIT', 'true');
    if (!version && hasPom) {
      await versions.getBuildVersion('-SNAPSHOT').then((v) => setVersion(v, workingDir));
    }
  }

  if (hasPom && version && version !== 'pom.xml') {
    await setVersion(version, workingDir);
  }

  await mvn.run(args, workingDir);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
