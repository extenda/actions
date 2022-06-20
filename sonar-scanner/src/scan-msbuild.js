const core = require('@actions/core');
const exec = require('@actions/exec');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { createParams } = require('./params');
const { getBuildVersion } = require('../../utils/src/versions');
const { credentials } = require('./sonar-credentials');

const markerFile = path.join(os.homedir(), '.github_action_sonar.txt');

const scanner = path.join(os.homedir(), '.dotnet', 'tools', 'dotnet-sonarscanner');

// Any 11+ openJDK will work for us.
const findJava11 = async () => {
  try {
    const basedir = process.env.JDK_BASEDIR || '/usr/lib/jvm';
    const jdks = fs.readdirSync(basedir);
    core.info(`Available JDKs: ${jdks.join(', ')}`);
    const jdk = jdks.find((f) => f.startsWith('adoptopenjdk-1'));
    return jdk ? path.join(basedir, jdk) : null;
  } catch (err) {
    core.error('/usr/lib/jvm not found');
    return null;
  }
};

const scanWithJavaHome = async (args) => {
  const env = { ...process.env };
  if (os.platform() !== 'win32') {
    const javaHome = await findJava11();
    if (javaHome) {
      core.info(`Set JAVA_HOME=${javaHome}`);
      env.JAVA_HOME = javaHome;
    }
  }
  if (typeof args === 'string') {
    return exec.exec(`${scanner} ${args}`, [], { env });
  }
  return exec.exec(scanner, args, { env });
};

const beginScan = async (hostUrl, mainBranch, sonarScanner, customArgs = '') => {
  await core.group('Install dotnet-sonarscanner', async () => {
    const [, scannerVersion = ''] = sonarScanner.split('-');
    let versionArg = '';
    if (scannerVersion !== '') {
      core.warning(`Using pinned dotnet-scanner version ${scannerVersion}`);
      versionArg = `--version ${scannerVersion}`;
    } else if (hostUrl.startsWith('https://sonar.extenda.io')) {
      versionArg = '--version 4.10.0';
    }
    await exec.exec(`dotnet tool install -g dotnet-sonarscanner ${versionArg}`);
  });

  const version = await getBuildVersion(`-${process.env.GITHUB_SHA}`);
  const extraParams = {
    '/v:': version,
    'sonar.coverage.exclusions': '**Test*.cs',
    'sonar.cs.vstest.reportsPaths': '**/*.trx',
    'sonar.cs.opencover.reportsPaths': '**/coverage.opencover.xml',
  };
  const params = await createParams(hostUrl, mainBranch, true, extraParams);

  await core.group('Begin Sonar analysis', async () => {
    await scanWithJavaHome(`begin ${params} ${customArgs}`);
  });
};

const finishScan = async (hostUrl) => {
  await core.group('End Sonar analysis', async () => {
    const { sonarToken } = await credentials(hostUrl);
    await scanWithJavaHome(['end', `/d:sonar.login=${sonarToken}`]);
  });
};

const scanMsBuild = async (hostUrl, mainBranch, sonarScanner, customArgs = '') => {
  if (!fs.existsSync(markerFile)) {
    // Create marker and begin scan
    fs.closeSync(fs.openSync(markerFile, 'w'));
    await beginScan(hostUrl, mainBranch, sonarScanner, customArgs);
    return false;
  }

  // Remove marker file
  fs.unlinkSync(markerFile);

  // Ongoing scan, finish it!
  await finishScan(hostUrl);
  return true;
};

module.exports = {
  markerFile,
  scanMsBuild,
};
