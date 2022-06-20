const mockFs = require('mock-fs');
const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getBuildVersion } = require('../../utils/src/versions');

jest.mock('@actions/exec');
jest.mock('../src/sonar-credentials');
jest.mock('../../utils/src/pull-request-info');
jest.mock('../../utils/src/versions');

const { scanMsBuild, markerFile } = require('../src/scan-msbuild');

const orgEnv = process.env;

describe('Scan MSBuild', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    delete process.env.JAVA_HOME;
    process.env.GITHUB_REF = 'master';
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
    process.env.SONAR_TOKEN = 'x';
    process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'push-event.json');
    getBuildVersion.mockReturnValueOnce('0.0.1-local');
  });

  afterEach(() => {
    mockFs.restore();
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It begins to scan when marker file is missing', async () => {
    mockFs({});
    const output = await scanMsBuild('https://sonar.extenda.io', 'master', 'dotnet');
    expect(output).toEqual(false);
    expect(fs.existsSync(markerFile)).toEqual(true);
    expect(exec.exec.mock.calls.length).toEqual(2);
    expect(exec.exec.mock.calls[0][0]).toEqual('dotnet tool install -g dotnet-sonarscanner --version 4.10.0');
    expect(exec.exec.mock.calls[1][0]).toContain('dotnet-sonarscanner');
    expect(exec.exec.mock.calls[1][0]).toContain('begin');
  });

  test('It can install a pinned dotnet-scanner version', async () => {
    mockFs({});
    await scanMsBuild('https://sonarcloud.io', 'master', 'dotnet-5.6.0');
    expect(exec.exec.mock.calls[0][0]).toEqual('dotnet tool install -g dotnet-sonarscanner --version 5.6.0');
  });

  test('It ends scan when marker file exists', async () => {
    // Create marker file
    const files = {};
    files[markerFile] = '';
    mockFs(files);

    const output = await scanMsBuild('https://sonar.extenda.io', 'master', 'dotnet');

    expect(output).toEqual(true);
    expect(exec.exec.mock.calls.length).toEqual(1);
    expect(exec.exec.mock.calls[0][0]).toContain('dotnet-sonarscanner');
    expect(exec.exec.mock.calls[0][1]).toContain('end');
  });

  test('It will skip JAVA_HOME on Windows', async () => {
    // Create marker file
    const files = {};
    files[markerFile] = '';
    mockFs(files);

    const platformSpy = jest.spyOn(os, 'platform').mockReturnValueOnce('win32');
    await scanMsBuild('https://sonar.extenda.io', 'master', 'dotnet');
    expect(Object.keys(exec.exec.mock.calls[0][2].env)).not.toContain('JAVA_HOME');
    platformSpy.mockRestore();
  });

  test('It can handle missing JDK', async () => {
    // Create marker file
    const files = {};
    files[markerFile] = '';
    mockFs(files);

    process.env.JDK_BASEDIR = '/tmp/missing';

    const platformSpy = jest.spyOn(os, 'platform').mockReturnValueOnce('linux');
    await scanMsBuild('https://sonar.extenda.io', 'master', 'dotnet');
    expect(Object.keys(exec.exec.mock.calls[0][2].env)).not.toContain('JAVA_HOME');
    platformSpy.mockRestore();
  });

  if (fs.existsSync('/usr/lib/jvm')) {
    test('It can set JAVA_HOME', async () => {
      // Create marker file
      const files = {};
      files[markerFile] = '';
      mockFs(files);

      const platformSpy = jest.spyOn(os, 'platform').mockReturnValueOnce('linux');
      await scanMsBuild('https://sonar.extenda.io', 'master', 'dotnet');
      expect(Object.keys(exec.exec.mock.calls[0][2].env)).toContain('JAVA_HOME');
      expect(exec.exec.mock.calls[0][2].env).toMatchObject({
        JAVA_HOME: '/usr/lib/jvm/adoptopenjdk-11-hotspot-amd64',
      });
      platformSpy.mockRestore();
    });
  }
});
