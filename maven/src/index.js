const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const mvn = require('./mvn');
const { run } = require('../../utils');
const versions = require('../../utils/src/versions');
const { withGcloud } = require('../../setup-gcloud');
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

const extensionsExists = (workingDir = './') => {
  const extensionsFile = path.join(workingDir, '.mvn', 'extensions.xml');
  if (fs.existsSync(extensionsFile)) {
    const fileContent = fs.readFileSync(extensionsFile, 'utf8');
    return fileContent.includes('artifactregistry-maven-wagon');
  }
  return false;
};

const authExec = async (serviceAccountKey, fn) => {
  if (serviceAccountKey) {
    await withGcloud(serviceAccountKey, fn);
  } else {
    await fn();
  }
};

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

  if (!process.env.MAVEN_INIT) {
    const usesArtifactRegistry = await mvn.copySettings(
      serviceAccountKey && extensionsExists(workingDir),
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
      const snapshotVersion = async () =>
        versions
          .getBuildVersion('-SNAPSHOT')
          .then((v) => setVersion(v, workingDir));

      await authExec(serviceAccountKey, snapshotVersion);
    }
  }

  const execMaven = async () => {
    if (hasPom && version && version !== 'pom.xml') {
      await setVersion(version, workingDir);
    }
    await mvn.run(args, workingDir);
  };
  await authExec(serviceAccountKey, execMaven);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
