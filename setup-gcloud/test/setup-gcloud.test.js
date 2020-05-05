const mockFs = require('mock-fs');

// Mock out tools download
jest.mock('../../utils', () => ({
  loadTool: async () => Promise.resolve('gcloud'),
}));

jest.mock('@actions/exec');
jest.mock('@actions/core');

const core = require('@actions/core');
const exec = require('@actions/exec');
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
  });

  beforeEach(() => {
    process.env = { ...orgEnv };
  });

  afterAll(() => {
    mockFs.restore();
  });

  test('It can configure gcloud latest', async () => {
    mockFs({});
    exec.exec.mockResolvedValueOnce(0);
    await setupGcloud(base64Key);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['auth', 'activate-service-account']));
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
  });

  test('It can configure gcloud 280.0.0', async () => {
    mockFs({});
    exec.exec.mockResolvedValueOnce(0);
    await setupGcloud(base64Key, '280.0.0');
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['auth', 'activate-service-account']));
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('GCLOUD_INSTALLED_VERSION', '280.0.0');
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS', async () => {
    mockFs({});
    exec.exec.mockResolvedValueOnce(0);
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable.mock.calls[0][0]).toEqual('GOOGLE_APPLICATION_CREDENTIALS');
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS and copy tmp file', async () => {
    process.env.GITHUB_WORKSPACE = '/workspace';
    mockFs({
      '/workspace': {},
    });
    exec.exec.mockResolvedValueOnce(0);
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable.mock.calls[0][0]).toEqual('GOOGLE_APPLICATION_CREDENTIALS');
    expect(core.exportVariable.mock.calls[0][1]).toContain('/workspace/');
  });
});
