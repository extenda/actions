const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');

jest.mock('@actions/exec');

jest.mock('../src/sonar-credentials');
jest.mock('../../utils/src/pull-request-info');

const { scanMsBuild, markerFile } = require('../src/scan-msbuild');

const orgEnv = process.env;

describe('Scan MSBuild', () => {
  beforeAll(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_REF = 'master';
    process.env.GITHUB_REPOSITORY = 'extenda/actions';
    process.env.SONAR_TOKEN = 'x';
    process.env.GITHUB_EVENT_PATH = path.join(__dirname, 'push-event.json');
  });

  afterAll(() => {
    process.env = orgEnv;
  });

  afterEach(() => {
    if (fs.existsSync(markerFile)) {
      fs.unlinkSync(markerFile);
    }
    jest.resetAllMocks();
  });

  test('It begins to scan when marker file is missing', async () => {
    const output = await scanMsBuild('https://sonar.extenda.io', 'master');
    expect(output).toEqual(false);
    expect(fs.existsSync(markerFile)).toEqual(true);
    expect(exec.exec.mock.calls.length).toEqual(2);
    expect(exec.exec.mock.calls[0][0]).toEqual('dotnet tool install -g dotnet-sonarscanner');
    expect(exec.exec.mock.calls[1][0]).toContain('dotnet-sonarscanner');
    expect(exec.exec.mock.calls[1][1]).toContain('begin');
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
});
