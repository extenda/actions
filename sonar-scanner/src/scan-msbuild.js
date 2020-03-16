const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createParams } = require('./params');
const { getBuildVersion } = require('../../utils/src/versions');

const markerFile = path.join(os.homedir(), '.github_action_sonar.txt');

const scanner = path.join(os.homedir(), '.dotnet', 'tools', 'dotnet-sonarscanner');

const beginScan = async (hostUrl, mainBranch) => {
  await core.group('Install dotnet-sonarscanner', async () => {
    await exec.exec('dotnet tool install -g dotnet-sonarscanner');
  });

  const extraParams = {
    '/v:': getBuildVersion(`-${process.env.GITHUB_SHA}`),
    'sonar.coverage.exclusions': '**Test*.cs',
    'sonar.cs.vstest.reportsPaths': '**/*.trx',
    'sonar.cs.opencover.reportsPaths': '**/coverage.opencover.xml',
  };
  const params = createParams(hostUrl, mainBranch, true, extraParams);

  await core.group('Begin Sonar analysis', async () => {
    await exec.exec(`${scanner} begin ${params}`);
  });
};

const finishScan = async () => {
  await core.group('End Sonar analysis', async () => {
    await exec.exec(`${scanner} end /d:sonar.login="${process.env.SONAR_TOKEN}"`);
  });
};

const scanMsBuild = async (hostUrl, mainBranch) => {
  if (!fs.existsSync(markerFile)) {
    // Create marker and begin scan
    fs.closeSync(fs.openSync(markerFile, 'w'));
    await beginScan(hostUrl, mainBranch);
    return false;
  }

  // Remove marker file
  fs.unlinkSync(markerFile);

  // Ongoing scan, finish it!
  await finishScan();
  return true;
};

module.exports = {
  markerFile,
  scanMsBuild,
};
