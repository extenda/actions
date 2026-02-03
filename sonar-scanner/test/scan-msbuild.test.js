import * as exec from '@actions/exec';
import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('@actions/exec');

jest.mock('../src/sonar-credentials');
jest.mock('../../utils/src/pull-request-info');

import { markerFile, scanMsBuild } from '../src/scan-msbuild.js';

const orgEnv = process.env;

describe('Scan MSBuild', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    delete process.env.JAVA_HOME;
    process.env.GITHUB_REF = 'master';
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
    process.env.SONAR_TOKEN = 'x';
    process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'push-event.json');
  });

  afterEach(() => {
    if (fs.existsSync(markerFile)) {
      fs.unlinkSync(markerFile);
    }
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It begins to scan when marker file is missing', async () => {
    const output = await scanMsBuild('https://sonar.extenda.io', 'master');
    expect(output).toEqual(false);
    expect(fs.existsSync(markerFile)).toEqual(true);
    expect(exec.exec.mock.calls.length).toEqual(2);
    expect(exec.exec.mock.calls[0][0]).toEqual(
      'dotnet tool install -g dotnet-sonarscanner --version 4.10.0',
    );
    expect(exec.exec.mock.calls[1][0]).toContain('dotnet-sonarscanner');
    expect(exec.exec.mock.calls[1][0]).toContain('begin');
  });

  test('It ends scan when marker file exists', async () => {
    // Create marker file
    fs.closeSync(fs.openSync(markerFile, 'w'));

    const output = await scanMsBuild('https://sonar.extenda.io', 'master');

    expect(output).toEqual(true);
    expect(exec.exec.mock.calls.length).toEqual(1);
    expect(exec.exec.mock.calls[0][0]).toContain('dotnet-sonarscanner');
    expect(exec.exec.mock.calls[0][1]).toContain('end');
  });

  test('It will skip JAVA_HOME on Windows', async () => {
    // Create marker file
    fs.closeSync(fs.openSync(markerFile, 'w'));

    const platformSpy = jest.spyOn(os, 'platform').mockReturnValue('win32');
    await scanMsBuild('https://sonar.extenda.io', 'master');
    expect(Object.keys(exec.exec.mock.calls[0][2].env)).not.toContain(
      'JAVA_HOME',
    );
    platformSpy.mockRestore();
  });

  test('It can handle missing JDK', async () => {
    // Create marker fil
    fs.closeSync(fs.openSync(markerFile, 'w'));
    process.env.JDK_BASEDIR = '/tmp/missing';

    const platformSpy = jest.spyOn(os, 'platform').mockReturnValue('linux');
    await scanMsBuild('https://sonar.extenda.io', 'master');
    expect(Object.keys(exec.exec.mock.calls[0][2].env)).not.toContain(
      'JAVA_HOME',
    );
    platformSpy.mockRestore();
  });
});
