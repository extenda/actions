const core = require('@actions/core');
const { checkEnv, run } = require('../../utils');
const { createProject } = require('./create-project');
const { scan } = require('./scan');
const { scanMsBuild } = require('./scan-msbuild');
const { checkQualityGate } = require('./check-quality-gate');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const isPullRequest = () => process.env.GITHUB_EVENT_NAME === 'pull_request';

const isBranchAnalysis = (mainBranch) => {
  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
  return branch !== mainBranch && !isPullRequest();
};

const defaultSonarToken = (hostUrl) => (
  hostUrl.startsWith('https://sonarcloud.io') ? 'sonarcloud-token' : 'sonarqube-token'
);

const loadSecrets = async (hostUrl) => {
  const serviceAccountKey = core.getInput('service-account-key');
  const githubTokenName = core.getInput('github-token-secret-name');
  const sonarTokenName = core.getInput('sonar-token-secret-name') || defaultSonarToken(hostUrl);

  // For backwards compatibility, we access these secrets as env vars.
  if (serviceAccountKey) {
    if (!process.env.GITHUB_TOKEN) {
      process.env.GITHUB_TOKEN = await loadSecret(serviceAccountKey, githubTokenName);
    }
    if (!process.env.SONAR_TOKEN) {
      process.env.SONAR_TOKEN = await loadSecret(serviceAccountKey, sonarTokenName);
    }
  }

  checkEnv(['SONAR_TOKEN', 'GITHUB_TOKEN']);
};

run(async () => {
  const hostUrl = core.getInput('sonar-host', { required: true });
  const mainBranch = core.getInput('main-branch', { required: true });
  const msbuild = core.getInput('msbuild');

  const scanCommands = {
    gradle: core.getInput('gradle-args'),
    maven: core.getInput('maven-args'),
  };

  const isSonarQube = hostUrl === 'https://sonar.extenda.io';

  if (isSonarQube && isBranchAnalysis(mainBranch)) {
    core.info(`${hostUrl} does not support multi-branch analysis. No analysis is performed.`);
    return;
  }

  await loadSecrets();

  // Auto-create SonarCloud projects
  await createProject(hostUrl);

  let waitForQualityGate = false;

  if (msbuild) {
    // MSBuild scanning
    waitForQualityGate = await scanMsBuild(hostUrl, mainBranch);
  } else {
    // Perform the scanning for everything else.
    await core.group('Run Sonar analysis', async () => scan(hostUrl, mainBranch, scanCommands));
    waitForQualityGate = true;
  }

  if (waitForQualityGate && isSonarQube && isPullRequest()) {
    // No quality gate analysis is performed for PRs on sonar.extenda.io
    core.info(`Skipping Quality Gate. Not supported for PRs on ${hostUrl}`);
    waitForQualityGate = false;
  }

  if (waitForQualityGate) {
    // Wait for the quality gate status to update
    const status = await core.group('Check Quality Gate', async () => checkQualityGate());
    if (status.statusCode !== 0) {
      process.exitCode = core.ExitCode.Failure;
    }
  }
});
