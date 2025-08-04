const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const path = require('path');
const { createParams } = require('./params');
const mvn = require('../../maven/src/mvn');

const isAutoDiscovered = (sonarScanner, workingDir, file) =>
  sonarScanner === 'auto' && fs.existsSync(path.join(workingDir, file));

const getCommands = (sonarScanner, custom, workingDir = '.') => {
  const commands = {};

  if (
    sonarScanner === 'gradle' ||
    custom.gradle ||
    isAutoDiscovered(sonarScanner, workingDir, 'build.gradle')
  ) {
    commands.gradle = custom.gradle || 'sonarqube';
  }

  if (
    sonarScanner === 'maven' ||
    custom.maven ||
    isAutoDiscovered(sonarScanner, workingDir, 'pom.xml')
  ) {
    commands.maven =
      custom.maven ||
      'org.sonarsource.scanner.maven:sonar-maven-plugin:5.1.0.4751:sonar';
  }

  if (
    sonarScanner === 'node' ||
    custom.npm ||
    isAutoDiscovered(sonarScanner, workingDir, 'package.json')
  ) {
    commands.npm = custom.npm || 'node_modules/.bin/sonar-scanner';
  }

  if (
    sonarScanner === 'yarn' ||
    custom.yarn ||
    isAutoDiscovered(sonarScanner, workingDir, 'yarn.lock')
  ) {
    commands.yarn = custom.yarn || 'node_modules/.bin/sonar-scanner';
  }

  return commands;
};

const scan = async (
  hostUrl,
  mainBranch,
  sonarScanner = 'auto',
  customCommands = {},
  workingDir = '.',
) => {
  const commands = getCommands(sonarScanner, customCommands, workingDir);
  const params = await createParams(hostUrl, mainBranch, workingDir, false, {});

  if (commands.gradle) {
    core.info('Scan with Gradle');
    return exec.exec(`./gradlew ${commands.gradle} ${params}`, [], {
      cwd: workingDir,
    });
  }
  if (commands.maven) {
    core.info('Scan with Maven');
    const dir = workingDir !== '.' ? `-f ${workingDir}` : '';
    return mvn.run(`${commands.maven} ${params} ${dir}`);
  }
  if (commands.yarn) {
    core.info('Scan with Yarn');
    await core.group('Install sonarqube-scanner', async () => {
      await exec.exec('yarn add -D sonarqube-scanner', [], { cwd: workingDir });
    });
    return exec.exec(`${commands.yarn} ${params}`, [], { cwd: workingDir });
  }
  if (commands.npm) {
    core.info('Scan with NPM');
    await core.group('Install sonarqube-scanner', async () => {
      await exec.exec('npm install sonarqube-scanner --no-save', [], {
        cwd: workingDir,
      });
    });
    return exec.exec(`${commands.npm} ${params}`, [], { cwd: workingDir });
  }
  throw new Error('No supported sonar-scanner detected.');
};

module.exports = {
  scan,
};
