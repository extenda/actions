const core = require('@actions/core');
const { run } = require('../../utils');
const { createProject } = require('./create-project');
const { scan } = require('./scan');
const { scanMsBuild } = require('./scan-msbuild');
const { checkQualityGate } = require('./check-quality-gate');
const { credentials } = require('./sonar-credentials');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');

const isPullRequest = async (hostUrl) => {
  const { githubToken } = await credentials(hostUrl);
  const pullRequest = await getPullRequestInfo(githubToken);
  return !!pullRequest;
};

const isBranchAnalysis = async (mainBranch, hostUrl) => {
  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
  if (branch !== mainBranch) {
    // Return false if this isn't a pull request.
    return isPullRequest(hostUrl).then((pullRequest) => !pullRequest);
  }
  return false;
};

const action = async () => {
  const hostUrl = core.getInput('sonar-host', { required: true });
  const mainBranch = core.getInput('main-branch', { required: true });
  const sonarScanner = core.getInput('sonar-scanner', { required: true });
  const verbose = core.getInput('verbose') === 'true';

  if (verbose) {
    process.env.SONAR_VERBOSE = 'true';
  }

  const scanCommands = {
    gradle: core.getInput('gradle-args'),
    maven: core.getInput('maven-args'),
  };

  const isSonarQube = hostUrl.startsWith('https://sonar.extenda.io');
  const branchAnalysis = await isBranchAnalysis(mainBranch, hostUrl);
  if (isSonarQube && branchAnalysis) {
    core.info(`${hostUrl} does not support multi-branch analysis. No analysis is performed.`);
    return;
  }

  // Auto-create SonarCloud projects
  await createProject(hostUrl);

  let waitForQualityGate = false;

  if (sonarScanner === 'dotnet') {
    // MSBuild scanning
    waitForQualityGate = await scanMsBuild(hostUrl, mainBranch);
  } else {
    // Perform the scanning for everything else.
    await core.group('Run Sonar analysis', async () => scan(hostUrl, mainBranch, sonarScanner, scanCommands));
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
};

if (require.main === module) {
  run(action);
}

module.exports = action;
