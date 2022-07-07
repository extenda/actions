const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const {createParams} = require('./params');
const mvn = require('../../maven/src/mvn');

const isAutoDiscovered = (sonarScanner, file) => sonarScanner === 'auto' && fs.existsSync(file);

const getCommands = (sonarScanner, custom) => {
  const commands = {};

  if (sonarScanner === 'gradle' || custom.gradle || isAutoDiscovered(sonarScanner, 'build.gradle')) {
    commands.gradle = custom.gradle || 'sonarqube';
  }

  if (sonarScanner === 'maven' || custom.maven || isAutoDiscovered(sonarScanner, 'pom.xml')) {
    commands.maven = custom.maven || 'org.sonarsource.scanner.maven:sonar-maven-plugin:3.7.0.1746:sonar';
  }

  if (sonarScanner === 'node' || custom.npm || isAutoDiscovered(sonarScanner, 'package.json')) {
    commands.npm = custom.npm || 'node_modules/.bin/sonar-scanner';
  }

  if (sonarScanner === 'yarn' || custom.yarn || isAutoDiscovered(sonarScanner, 'yarn.lock')) {
    commands.yarn = custom.yarn || 'node_modules/.bin/sonar-scanner';
  }

  return commands;
};

const scan = async (hostUrl, mainBranch, sonarScanner = 'auto', customCommands = {}) => {
  const commands = getCommands(sonarScanner, customCommands);
  const params = await createParams(hostUrl, mainBranch);

  if (commands.gradle) {
    core.info('Scan with Gradle');
    return exec.exec(`./gradlew ${commands.gradle} ${params}`);
  }
  if (commands.maven) {
    core.info('Scan with Maven');
    return mvn.run(`${commands.maven} ${params}`);
  }
  if (commands.yarn) {
    core.info('Scan with Yarn');
    await core.group('Install sonarqube-scanner', async () => {
      await exec.exec('yarn add -D sonarqube-scanner');
    });
    return exec.exec(`${commands.yarn} ${params}`);
  }
  if (commands.npm) {
    core.info('Scan with NPM');
    await core.group('Install sonarqube-scanner', async () => {
      await exec.exec('npm install sonarqube-scanner --no-save');
    });
    return exec.exec(`${commands.npm} ${params}`);
  }
  throw new Error('No supported sonar-scanner detected.');
};

module.exports = {
  scan,
};
