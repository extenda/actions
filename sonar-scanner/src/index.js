import * as core from '@actions/core';

import { getPullRequestInfo } from '../../utils/src/pull-request-info.js';
import { checkQualityGate } from './check-quality-gate.js';
import { createProject } from './create-project.js';
import { scan } from './scan.js';
import { scanMsBuild } from './scan-msbuild.js';
import { credentials } from './sonar-credentials.js';

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
  const reportPath = core.getInput('report-path');
  const workingDir = core.getInput('working-directory') || '.';
  const shouldCreateProject = core.getBooleanInput('create-sonar-project');

  if (verbose) {
    process.env.SONAR_VERBOSE = 'true';
  }

  const scanCommands = {
    dotnet: core.getInput('dotnet-args'),
    gradle: core.getInput('gradle-args'),
    maven: core.getInput('maven-args'),
    npm: core.getInput('npm-args'),
    yarn: core.getInput('yarn-args'),
  };

  const isSonarQube = hostUrl.startsWith('https://sonar.extenda.io');
  const branchAnalysis = await isBranchAnalysis(mainBranch, hostUrl);
  if (isSonarQube && branchAnalysis) {
    core.info(
      `${hostUrl} does not support multi-branch analysis. No analysis is performed.`,
    );
    return;
  }

  // Auto-create SonarCloud projects
  if (shouldCreateProject) {
    await createProject(hostUrl, workingDir);
  }

  let waitForQualityGate;

  if (sonarScanner === 'dotnet') {
    // MSBuild scanning
    waitForQualityGate = await scanMsBuild(
      hostUrl,
      mainBranch,
      scanCommands.dotnet,
    );
  } else {
    // Perform the scanning for everything else.
    await core.group('Run Sonar analysis', async () =>
      scan(hostUrl, mainBranch, sonarScanner, scanCommands, workingDir),
    );
    waitForQualityGate = true;
  }

  if (waitForQualityGate && isSonarQube && (await isPullRequest())) {
    // No quality gate analysis is performed for PRs on sonar.extenda.io
    core.info(`Skipping Quality Gate. Not supported for PRs on ${hostUrl}`);
    waitForQualityGate = false;
  }
  if (waitForQualityGate && isSonarQube) {
    waitForQualityGate = false;
  }

  if (waitForQualityGate) {
    // Wait for the quality gate status to update
    const status = await core.group('Check Quality Gate', async () =>
      checkQualityGate(reportPath, workingDir),
    );
    if (status.statusCode !== 0) {
      process.exitCode = core.ExitCode.Failure;
    }
  }
};

export default action;
