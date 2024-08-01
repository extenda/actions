jest.mock('../src/create-project');
jest.mock('../src/scan');
jest.mock('../src/scan-msbuild');
jest.mock('../src/check-quality-gate');
jest.mock('../src/sonar-credentials', () => ({
  credentials: () => ({
    githubToken: 'GITHUB_TOKEN',
    sonarToken: 'SONAR_TOKEN',
  }),
}));
jest.mock('../../utils/src/pull-request-info');

const core = require('@actions/core');
const { createProject } = require('../src/create-project');
const { scan } = require('../src/scan');
const { scanMsBuild } = require('../src/scan-msbuild');
const { checkQualityGate } = require('../src/check-quality-gate');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const action = require('../src/index');

const orgEnv = process.env;
const getInput = jest.spyOn(core, 'getInput');

const mockInputs = (
  hostUrl,
  scanner = 'auto',
  verbose = false,
  reportPath = '',
  cwd = '.',
) => {
  getInput
    .mockReturnValueOnce(hostUrl)
    .mockReturnValueOnce('master')
    .mockReturnValueOnce(scanner)
    .mockReturnValueOnce(verbose ? 'true' : 'false')
    .mockReturnValueOnce(reportPath)
    .mockReturnValueOnce(cwd);
};

const mockPullRequest = (isPullRequest) => {
  if (isPullRequest) {
    getPullRequestInfo.mockResolvedValueOnce({
      base: { ref: '1' },
      head: { ref: '2' },
      number: 1,
    });
  } else {
    getPullRequestInfo.mockResolvedValueOnce(undefined);
  }
};

const defaultCommands = {
  dotnet: undefined,
  gradle: undefined,
  maven: undefined,
  npm: undefined,
  yarn: undefined,
};

describe('Sonar-Scanner Action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REF: 'refs/heads/master',
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It prevents branch-analysis on sonar.extenda.io', async () => {
    process.env.GITHUB_REF = 'refs/heads/feature/test';
    mockInputs('https://sonar.extenda.io');
    mockPullRequest(false);

    await action();

    expect(createProject).not.toHaveBeenCalled();
    expect(scan).not.toHaveBeenCalled();
    expect(scanMsBuild).not.toHaveBeenCalled();
    expect(checkQualityGate).not.toHaveBeenCalled();
  });

  test('It supports PR analysis on sonar.extenda.io', async () => {
    process.env.GITHUB_REF = 'refs/heads/feature/test';
    mockInputs('https://sonar.extenda.io');
    mockPullRequest(true);
    mockPullRequest(true);

    await action();

    expect(scan).toHaveBeenCalledWith(
      'https://sonar.extenda.io',
      'master',
      'auto',
      defaultCommands,
      '.',
    );
    expect(checkQualityGate).not.toHaveBeenCalled();
  });

  test('It analyses main branch on sonar.extenda.io', async () => {
    mockInputs('https://sonar.extenda.io');
    mockPullRequest(false);

    await action();

    expect(scan).toHaveBeenCalledWith(
      'https://sonar.extenda.io',
      'master',
      'auto',
      defaultCommands,
      '.',
    );
    expect(checkQualityGate).not.toHaveBeenCalled();
  });

  test('It will set verbose logging', async () => {
    mockInputs('https://sonarcloud.io', 'auto', true);
    mockPullRequest(false);
    checkQualityGate.mockResolvedValueOnce(0);
    await action();
    expect(process.env.SONAR_VERBOSE).toEqual('true');
  });

  test('It will set path to report', async () => {
    mockInputs('https://sonarcloud.io', 'auto', true, './path/to/report.txt');
    mockPullRequest(false);
    checkQualityGate.mockResolvedValueOnce(0);
    await action();
    expect(checkQualityGate).toHaveBeenCalledWith('./path/to/report.txt', '.');
  });

  test('It will use scan for auto', async () => {
    mockInputs('https://sonarcloud.io', 'auto');
    mockPullRequest(false);
    scan.mockResolvedValueOnce(0);
    checkQualityGate.mockResolvedValueOnce(0);
    await action();
    expect(scan).toHaveBeenCalled();
    expect(checkQualityGate).toHaveBeenCalled();
  });

  test('It will use scanMsBuild for dotnet', async () => {
    mockInputs('https://sonarcloud.io', 'dotnet');
    getInput.mockReturnValueOnce('');
    mockPullRequest(true);
    checkQualityGate.mockResolvedValueOnce(0);
    scanMsBuild.mockResolvedValueOnce(true);
    await action();
    expect(scanMsBuild).toHaveBeenCalledWith(
      'https://sonarcloud.io',
      'master',
      '',
    );
    expect(checkQualityGate).toHaveBeenCalled();
  });

  test('It will scan PRs but skip QualityGate on sonar.extenda.io', async () => {
    mockInputs('https://sonar.extenda.io', 'auto');
    mockPullRequest(true);
    scan.mockResolvedValueOnce(0);
    await action();
    expect(scan).toHaveBeenCalled();
    expect(checkQualityGate).not.toHaveBeenCalled();
  });

  test('It will handle working-directory scans', async () => {
    process.env.GITHUB_REF = 'refs/heads/feature/test';
    mockInputs('https://sonarcloud.io', 'auto', false, '', './build/test');
    mockPullRequest(true);
    mockPullRequest(true);
    checkQualityGate.mockResolvedValueOnce(0);

    await action();

    expect(scan).toHaveBeenCalledWith(
      'https://sonarcloud.io',
      'master',
      'auto',
      defaultCommands,
      './build/test',
    );
    expect(checkQualityGate).toHaveBeenCalled();
  });
});
