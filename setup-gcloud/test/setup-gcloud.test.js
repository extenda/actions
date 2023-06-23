const mockFs = require('mock-fs');
const path = require('path');

jest.mock('@actions/tool-cache', () => ({
  downloadTool: jest.fn(),
  extractTar: jest.fn(),
  cacheDir: jest.fn().mockResolvedValue('/tmp/cache/gcloud'),
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
    jest.clearAllMocks();
    process.env = orgEnv;
    mockFs.restore();
  });

  beforeEach(() => {
    process.env = {
      RUNNER_TEMP: '/tmp',
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
    const expectedBinPath = path.join('/tmp', 'cache', 'gcloud', 'google-cloud-sdk', 'bin');
    await setupGcloud(base64Key);
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['install', 'gke-gcloud-auth-plugin']));
    expect(exec.exec.mock.calls[1][1]).toEqual(expect.arrayContaining(['auth', 'activate-service-account']));
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('CLOUDSDK_CORE_PROJECT', 'test-project');
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath);
  });

  test('It can configure gcloud 280.0.0', async () => {
    exec.exec.mockResolvedValueOnce(0);
    await setupGcloud(base64Key, '280.0.0');
    const expectedBinPath = path.join('/tmp', 'cache', 'gcloud', 'google-cloud-sdk', 'bin');
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['install', 'gke-gcloud-auth-plugin']));
    expect(exec.exec.mock.calls[1][1]).toEqual(expect.arrayContaining(['auth', 'activate-service-account']));
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('CLOUDSDK_CORE_PROJECT', 'test-project');
    expect(core.exportVariable).toHaveBeenCalledWith('GCLOUD_INSTALLED_VERSION', '280.0.0');
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath);
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const expectedBinPath = path.join('/tmp', 'cache', 'gcloud', 'google-cloud-sdk', 'bin');
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable.mock.calls[0][0]).toEqual('GOOGLE_APPLICATION_CREDENTIALS');
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath);
  });

  test('It can export GOOGLE_APPLICATION_CREDENTIALS and copy tmp file', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const expectedBinPath = path.join('/tmp', 'cache', 'gcloud', 'google-cloud-sdk', 'bin');
    await setupGcloud(base64Key, 'latest', true);
    expect(core.exportVariable.mock.calls[0][0]).toEqual('GOOGLE_APPLICATION_CREDENTIALS');

    const keyFile = path.parse(core.exportVariable.mock.calls[0][1]);
    expect(keyFile.dir).toEqual(path.normalize(process.env.RUNNER_TEMP));
    expect(core.addPath).toHaveBeenCalledWith(expectedBinPath);
  });
});
