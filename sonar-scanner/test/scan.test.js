jest.mock('../src/sonar-credentials');
jest.mock('@actions/exec');
jest.mock('../src/params.js', () => ({
  createParams: async () => '-Dsonar.verbose=false',
}));
jest.mock('../../maven/src/mvn', () => ({
  run: jest.fn(),
}));

const fs = require('mock-fs');
const exec = require('@actions/exec');
const mvn = require('../../maven/src/mvn');

const { scan } = require('../src/scan');

const ALL_FILE_TYPES = {
  'pom.xml': '<project />',
  'build.gradle': '',
  'package.json': '{}',
};

describe('Scan', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => {
    fs.restore();
  });

  describe('Maven', () => {
    test('It discovers Maven', async () => {
      fs({ 'pom.xml': '<project />' });
      await scan('https://sonarcloud.io', 'master', 'auto');
      expect(mvn.run).toHaveBeenCalledTimes(1);
      expect(mvn.run.mock.calls[0][0]).toContain('org.sonarsource.scanner.maven:sonar-maven-plugin');
    });

    test('It uses configured Maven sonar-scanner', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'maven');
      expect(mvn.run).toHaveBeenCalledTimes(1);
    });

    test('It supports maven-args', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'maven', { maven: 'scan' });
      expect(mvn.run).toHaveBeenCalledTimes(1);
      expect(mvn.run.mock.calls[0][0]).toContain('scan');
    });

    test('It supports working-directory', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'maven', { maven: 'scan' }, 'test');
      expect(mvn.run.mock.calls[0][0]).toContain('-f test');
    });
  });

  describe('Gradle', () => {
    test('It discovers Gradle', async () => {
      fs({ 'build.gradle': '' });
      await scan('https://sonarcloud.io', 'master', 'auto');
      expect(exec.exec.mock.calls[0][0]).toEqual('./gradlew sonarqube -Dsonar.verbose=false');
    });

    test('It uses configured Gradle sonar-scanner', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'gradle');
      expect(exec.exec.mock.calls[0][0]).toEqual('./gradlew sonarqube -Dsonar.verbose=false');
    });

    test('It supports gradle-args', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'gradle', { gradle: 'scan' });
      expect(exec.exec).toHaveBeenCalledTimes(1);
      expect(exec.exec.mock.calls[0][0]).toEqual('./gradlew scan -Dsonar.verbose=false');
    });

    test('It supports working-directory', async () => {
      fs(ALL_FILE_TYPES);
      await scan('https://sonarcloud.io', 'master', 'gradle', { gradle: 'scan' }, 'test');
      expect(exec.exec.mock.calls[0][1]).toEqual({ cwd: 'test' });
    });
  });

  describe('Node', () => {
    test('It discovers node', async () => {
      fs({ 'package.json': '{}' });
      await scan('https://sonarcloud.io', 'master', 'auto');
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec.mock.calls[0][0]).toEqual('npm install sonarqube-scanner --no-save');
      expect(exec.exec.mock.calls[1][0]).toEqual('node_modules/.bin/sonar-scanner -Dsonar.verbose=false');
    });

    test('It supports working-directory', async () => {
      fs({ 'test/package.json': '{}' });
      await scan('https://sonarcloud.io', 'master', 'auto', {}, 'test');
      expect(exec.exec.mock.calls[0][1]).toEqual({ cwd: 'test' });
      expect(exec.exec.mock.calls[1][1]).toEqual({ cwd: 'test' });
    });
  });

  describe('Yarn', () => {
    test('It discovers yarn', async () => {
      fs({ 'package.json': '{}' });
      fs({ 'yarn.lock': '{}' });
      await scan('https://sonarcloud.io', 'master', 'auto');
      expect(exec.exec).toHaveBeenCalledTimes(2);
      expect(exec.exec.mock.calls[0][0]).toEqual('yarn add -D sonarqube-scanner');
      expect(exec.exec.mock.calls[1][0]).toEqual('node_modules/.bin/sonar-scanner -Dsonar.verbose=false');
    });

    test('It supports working-directory', async () => {
      fs({ 'test/package.json': '{}' });
      fs({ 'test/yarn.lock': '{}' });
      await scan('https://sonarcloud.io', 'master', 'auto', {}, 'test');
      expect(exec.exec.mock.calls[0][1]).toEqual({ cwd: 'test' });
      expect(exec.exec.mock.calls[1][1]).toEqual({ cwd: 'test' });
    });
  });

  test('It throws for unsupported sonar-scanner', async () => {
    fs({ 'empty.txt': '' });
    await expect(scan('https://sonarcloud.io', 'master', 'auto'))
      .rejects.toEqual(new Error('No supported sonar-scanner detected.'));
  });
});
