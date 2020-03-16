const core = require('@actions/core');
const { checkEnv, run } = require('../../utils');
const { createProject } = require('./create-project');
const { scan } = require('./scan');
const { scanMsBuild } = require('./scan-msbuild');
const { checkQualityGate } = require('./check-quality-gate');
const { postComment } = require('./pr-comment');

run(async () => {
  const hostUrl = core.getInput('sonar-host', { required: true });
  const mainBranch = core.getInput('main-branch', { required: true });
  const msbuild = core.getInput('msbuild');

  const scanCommands = {
    gradle: core.getInput('gradle-args'),
    maven: core.getInput('maven-args'),
  };

  checkEnv(['SONAR_TOKEN', 'GITHUB_TOKEN']);

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

  if (waitForQualityGate) {
    // Wait for the quality gate status to update
    const status = await core.group('Check Quality Gate', async () => checkQualityGate());
    if (status.statusCode !== 0) {
      if (status.serverUrl === 'https://sonar.extenda.io') {
        await postComment(status);
      }
      process.exitCode = core.ExitCode.Failure;
    }
  }
});
