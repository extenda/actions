import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getBuildVersion } from '../../utils/src/versions.js';
import { createParams } from './params.js';
import { credentials } from './sonar-credentials.js';

const markerFile = path.join(os.homedir(), '.github_action_sonar.txt');

const scanner = path.join(
  os.homedir(),
  '.dotnet',
  'tools',
  'dotnet-sonarscanner',
);

// JDK 11 will soon be deprecated. Need atleast JDK 17.
const findJava17 = async () => {
  try {
    const basedir = process.env.JDK_BASEDIR || '/usr/lib/jvm';
    const jdks = fs.readdirSync(basedir);
    core.info(`Available JDKs: ${jdks.join(', ')}`);
    const jdk = jdks.find((f) => f.startsWith('temurin-17'));
    return jdk ? path.join(basedir, jdk) : null;
  } catch {
    core.error('/usr/lib/jvm not found');
    return null;
  }
};

const scanWithJavaHome = async (args, workingDir = '.') => {
  const env = { ...process.env };
  if (os.platform() !== 'win32') {
    const javaHome = await findJava17();
    if (javaHome) {
      core.info(`Set JAVA_HOME=${javaHome}`);
      env.JAVA_HOME = javaHome;
    }
  }
  if (typeof args === 'string') {
    return exec.exec(`${scanner} ${args}`, [], { env, cwd: workingDir });
  }
  return exec.exec(scanner, args, { env, cwd: workingDir });
};

const beginScan = async (hostUrl, mainBranch, workingDir, customArgs = '') => {
  await core.group('Install dotnet-sonarscanner', async () => {
    await exec.exec(
      `dotnet tool install -g dotnet-sonarscanner ${hostUrl.startsWith('https://sonar.extenda.io') ? '--version 4.10.0' : ''}`,
      [],
      { cwd: workingDir },
    );
  });

  const version = await getBuildVersion(`-${process.env.GITHUB_SHA}`);
  const extraParams = {
    '/v:': version,
    'sonar.coverage.exclusions': '**Test*.cs',
    'sonar.cs.vstest.reportsPaths': '**/*.trx',
    'sonar.cs.opencover.reportsPaths': '**/coverage.opencover.xml',
  };
  const params = await createParams(
    hostUrl,
    mainBranch,
    workingDir,
    true,
    extraParams,
  );

  await core.group('Begin Sonar analysis', async () => {
    await scanWithJavaHome(`begin ${params} ${customArgs}`, workingDir);
  });
};

const finishScan = async (hostUrl, workingDir) => {
  await core.group('End Sonar analysis', async () => {
    const { sonarToken } = await credentials(hostUrl);
    await scanWithJavaHome(['end', `/d:sonar.login=${sonarToken}`], workingDir);
  });
};

const scanMsBuild = async (
  hostUrl,
  mainBranch,
  customArgs = '',
  workingDir = '.',
) => {
  if (!fs.existsSync(markerFile)) {
    // Create marker and begin scan
    fs.closeSync(fs.openSync(markerFile, 'w'));
    await beginScan(hostUrl, mainBranch, workingDir, customArgs);
    return false;
  }

  // Remove marker file
  fs.unlinkSync(markerFile);

  // Ongoing scan, finish it!
  await finishScan(hostUrl);
  return true;
};

export { markerFile, scanMsBuild };
