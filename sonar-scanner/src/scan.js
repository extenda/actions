const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const { createParams } = require('./params');
const mvn = require('../../maven/src/mvn');

const getCommands = (custom) => {
  const commands = {};
  if (custom.gradle) {
    commands.gradle = custom.gradle;
  } else if (fs.existsSync('build.gradle')) {
    commands.gradle = 'sonarqube';
  }

  if (custom.maven) {
    commands.maven = custom.maven;
  } else if (fs.existsSync('pom.xml')) {
    commands.maven = 'org.sonarsource.scanner.maven:sonar-maven-plugin:3.7.0.1746:sonar';
  }

  if (fs.existsSync('package.json')) {
    commands.npm = 'node_modules/.bin/sonar-scanner';
  }
  return commands;
};

const scan = async (hostUrl, mainBranch, customCommands = {}) => {
  const commands = getCommands(customCommands);
  const params = createParams(hostUrl, mainBranch);

  if (commands.gradle) {
    core.info('Scan with Gradle');
    return exec.exec(`./gradlew ${commands.gradle} ${params}`);
  } if (commands.maven) {
    core.info('Scan with Maven');
    return mvn.run(`${commands.maven} ${params}`);
  } if (commands.npm) {
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
