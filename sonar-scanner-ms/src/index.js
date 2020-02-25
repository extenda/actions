const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const os = require('os');
const { checkEnv } = require('../../utils');
const { checkQualityGate } = require('./check-quality-gate');

const run = async () => {
  const sonarIndicator = 'github_action_sonar_indicator';
  const homeDir = os.homedir();
  const scanner = `${homeDir}/.dotnet/tools/dotnet-sonarscanner`;
  try {
    checkEnv(['SONAR_TOKEN', 'GITHUB_TOKEN']);
    if (!fs.existsSync(sonarIndicator)) {
      // before build
      const hostUrl = core.getInput('sonar-host', { required: true });
      const projectKey = core.getInput('project-key', { required: true });
      const projectName = core.getInput('project-name', { required: true });
      const version = core.getInput('version', { required: true });

      // create indicator file
      fs.closeSync(fs.openSync(sonarIndicator, 'w'));

      // start scanner
      await exec.exec('dotnet tool install -g dotnet-sonarscanner');
      const options = [];
      options.push(`/k:${projectKey}`);
      options.push(`/n:${projectName}`);
      options.push(`/v:${version}`);
      options.push('/d:sonar.coverage.exclusions=”**Test*.cs”');
      options.push(`/d:sonar.host.url="${hostUrl}"`);
      options.push('/d:sonar.cs.vstest.reportsPaths="**/*.trx"');
      options.push('/d:sonar.cs.opencover.reportsPaths=**/coverage.opencover.xml');
      options.push(`/d:sonar.login="${process.env.SONAR_TOKEN}"`);
      options.push('/d:sonar.verbose=true');

      const opts = options.join(' ');
      core.info(`starting sonar scanner with parameters: ${opts}`);
      await exec.exec(`${scanner} begin ${opts}`);
    } else {
      // after build
      await exec.exec(`${scanner} end /d:sonar.login="${process.env.SONAR_TOKEN}"`);

      // wait for quality gate
      const status = await core.group('Check Quality Gate', async () => checkQualityGate());
      if (status !== 0) {
        process.exitCode = core.ExitCode.Failure;
      }
    }
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
