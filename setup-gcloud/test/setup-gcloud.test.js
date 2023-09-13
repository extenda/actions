const mockFs = require('mock-fs');
const path = require('path');

// Mock out tools download
const mockFindTool = jest.fn();
jest.mock('../../utils', () => ({
  loadTool: async () => Promise.resolve('gcloud'),
  findTool: mockFindTool,
}));

jest.mock('@actions/cache');
jest.mock('@actions/exec');
jest.mock('@actions/core');

const core = require('@actions/core');
const exec = require('@actions/exec');
const { restoreCache } = require('@actions/cache');
const setupGcloud = require('../src/setup-gcloud');

const jsonKey = {
  project_id: 'test-project',
};

const base64Key = Buffer.from(JSON.stringify(jsonKey), 'utf8').toString('base64');

const orgEnv = process.env;

describe('Setup Gcloud', () => {
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
    mockFs.restore();
  });

  beforeEach(() => {
    process.env = {
      RUNNER_TEMP: '/tmp',
      RUNNER_TOOL_CACHE: '/opt/toolcache',
      RUNNER_ARCH: 'X64',
      ...orgEnv,
    };

    const filesystem = {};
    filesystem[process.env.RUNNER_TEMP] = {};
    mockFs(filesystem);
  });

  afterAll(() => {
    mockFs.restore();
  });

  test('It can configure gcloud latest', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce(undefined); // No cache entry.
    await setupGcloud(base64Key);
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec).toHaveBeenNthCalledWith(
      1,
      'gcloud',
      expect.arrayContaining(['install', 'gke-gcloud-auth-plugin']),
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenNthCalledWith(
      2,
      'gcloud',
      expect.arrayContaining(['auth', 'activate-service-account']),
      expect.anything(),
    );
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('CLOUDSDK_CORE_PROJECT', 'test-project');
  });

  test('It can configure gcloud 280.0.0 from cache', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce('found');
    mockFindTool.mockResolvedValueOnce(path.join(process.env.RUNNER_TOOL_CACHE, 'gcloud', 'x64'));
    await setupGcloud(base64Key, '280.0.0');
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith(
      'gcloud',
      expect.arrayContaining(['auth', 'activate-service-account']),
      expect.anything(),
    );
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('CLOUDSDK_CORE_PROJECT', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('GCLOUD_INSTALLED_VERSION', '280.0.0');
    expect(mockFindTool).toHaveBeenCalled();
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce(undefined);
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable).toHaveBeenCalledWith('GOOGLE_APPLICATION_CREDENTIALS', expect.any(String));
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS and copy tmp file', async () => {
    exec.exec.mockResolvedValueOnce(0);
    restoreCache.mockResolvedValueOnce('found');
    mockFindTool.mockResolvedValueOnce(path.join(process.env.RUNNER_TOOL_CACHE, 'gcloud', 'x64'));
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable).toHaveBeenNthCalledWith(
      2,
      'GOOGLE_APPLICATION_CREDENTIALS',
      expect.any(String),
    );
    const keyFile = path.parse(core.exportVariable.mock.calls[1][1]);
    expect(keyFile.dir).toEqual(path.normalize(process.env.RUNNER_TEMP));
  });
});
