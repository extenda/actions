const core = require('@actions/core');
const { checkEnv } = require('../../utils');
const { createProject } = require('./create-project');
const { scan } = require('./scan');
const { checkQualityGate } = require('./check-quality-gate');

const run = async () => {
  const hostUrl = core.getInput('sonar-host', { required: true });
  const mainBranch = core.getInput('main-branch', { required: true });

  const scanCommands = {
    gradle: core.getInput('gradle-args'),
    maven: core.getInput('maven-args'),
  };

  try {
    checkEnv(['SONAR_TOKEN', 'GITHUB_TOKEN']);

    // Auto-create SonarCloud projects
    await createProject(hostUrl);

    // Perform the scanning
    await core.group('Run Sonar analysis', async () =>
      scan(hostUrl, mainBranch, scanCommands));

    // Wait for the quality gate status to update
    const status = await core.group('Check Quality Gate', async () =>
      checkQualityGate());

    if (status !== 0) {
      process.exitCode = core.ExitCode.Failure;
    }
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
