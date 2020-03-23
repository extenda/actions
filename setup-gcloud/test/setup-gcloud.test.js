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

describe('Setup Gcloud', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    mockFs.restore();
  });

  test('It can configure gcloud', async () => {
    mockFs({});
    exec.exec.mockResolvedValueOnce(0)
      .mockImplementationOnce(async (tool, args, options) => {
        options.listeners.stdout(Buffer.from('test-project'));
        return 0;
      });
    const key = Buffer.from('test', 'utf8').toString('base64');
    await setupGcloud(key);
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['auth', 'activate-service-account']));
    expect(exec.exec.mock.calls[1][1]).toEqual(expect.arrayContaining(['config', 'list']));
    expect(core.setOutput).toHaveBeenCalledWith('project-id', 'test-project');
  }, 30000);
});
