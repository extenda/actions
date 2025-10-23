const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const mvn = require('./mvn');
const { run } = require('../../utils');
const versions = require('../../utils/src/versions');
const { setupGcloud } = require('../../setup-gcloud');
const loadNexusCredentials = require('./nexus-credentials');

const setVersion = async (version, workingDir = './') =>
  core.group(
    `Set version ${version} (working directory ${workingDir})`,
    async () => mvn.setVersion(version, workingDir),
  );

// Determine if a POM exists. If file argument is given, assume it is valid.
// If none set, look for pom in pwd.
const pomExists = (args, workingDir = './') =>
  args.includes('-f ') ||
  args.includes('--file=') ||
  fs.existsSync(path.join(workingDir, 'pom.xml'));

const extensionsExists = (workingDir = './') =>
  fs.existsSync(path.join(workingDir, '.mvn', 'extensions.xml'));

const action = async () => {
  const args = core.getInput('args', { required: true });
  const version = core.getInput('version');
  const serviceAccountKey = core.getInput('service-account-key') || '';
  const nexusUsernameSecretName =
    core.getInput('nexus-username-secret-name') || '';
  const nexusPasswordSecretName =
    core.getInput('nexus-password-secret-name') || '';
  const workingDir = core.getInput('working-directory');

  const hasPom = pomExists(args, workingDir);

  if (serviceAccountKey) {
    await setupGcloud(serviceAccountKey, 'latest', true);
  }

  if (!process.env.MAVEN_INIT) {
    const usesArtifactRegistry = await mvn.copySettings(
      extensionsExists(workingDir),
    );
    if (usesArtifactRegistry) {
      core.info('Use GCP Artifact Registry as repository');
    } else {
      core.info('Use Nexus Repository Manager as repository');
      await loadNexusCredentials(
        serviceAccountKey,
        nexusUsernameSecretName,
        nexusPasswordSecretName,
      );
    }
    core.exportVariable('MAVEN_INIT', 'true');
    if (!version && hasPom) {
      await versions
        .getBuildVersion('-SNAPSHOT')
        .then((v) => setVersion(v, workingDir));
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
