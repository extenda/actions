const exec = require('@actions/exec');
const execGcloud = require('../../src/utils/gcloud-output');
const handleError = require('../../src/utils/error-handler');

jest.mock('@actions/exec');
jest.mock('../../src/utils/error-handler');

const gcloudArgs = ['compute', 'create', 'url-maps', 'name'];

describe('execGcloud', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it executes gcloud and returns trimmed standard output', async () => {
    // Set up mock for exec
    exec.exec.mockImplementation((command, args, options) => {
      options.listeners.stdout('Mocked Standard Output\n');
      return Promise.resolve(0); // Simulate success
    });
    const result = await execGcloud(gcloudArgs);
    expect(result).toEqual('Mocked Standard Output');
    expect(exec.exec).toHaveBeenCalledWith('gcloud', gcloudArgs, {
      silent: true,
      listeners: expect.any(Object),
    });
    expect(handleError).not.toHaveBeenCalled();
  });

  test('it handles errors and calls handleError', async () => {
    exec.exec.mockImplementation((command, args, options) => {
      options.listeners.stderr('Mocked Error Output\n');
      return Promise.reject(new Error('Command failed'));
    });

    await execGcloud(gcloudArgs);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', gcloudArgs, {
      silent: true,
      listeners: expect.any(Object),
    });
    expect(handleError).toHaveBeenCalledWith(
      'Mocked Error Output',
      'create url-maps name',
    );
  });
});
