const setupGcloud = require('../src/setup-gcloud');
const { execGcloud } = require('../src/exec-gcloud');
const withGcloud = require('../src/with-gcloud');

jest.mock('../src/setup-gcloud');
jest.mock('../src/exec-gcloud');

describe('With Gcloud', () => {
  let orgEnv;

  beforeEach(() => {
    orgEnv = process.env;
    process.env = { ...orgEnv };
    setupGcloud.mockResolvedValueOnce('test-project');
  });

  afterEach(() => {
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It can run without existing gcloud installation', async () => {
    delete process.env.GCLOUD_INSTALLED_VERSION;
    const callback = jest.fn();

    await withGcloud('json-key', callback);

    expect(execGcloud).not.toHaveBeenCalled();
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
  });

  test('It can restore previous account', async () => {
    process.env.GCLOUD_INSTALLED_VERSION = '400.0.0';

    execGcloud
      .mockResolvedValueOnce(JSON.stringify('previous-account')) // Previous account
      .mockResolvedValueOnce(JSON.stringify('json-key-account')) // Current account
      .mockResolvedValueOnce(''); // Restore response

    const callback = jest.fn();

    const result = await withGcloud('json-key', callback);
    expect(result).toBeUndefined();

    expect(execGcloud).toHaveBeenNthCalledWith(
      1,
      ['config', 'get', 'account', '--format=json'],
      'gcloud',
      true,
    );
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(execGcloud).toHaveBeenNthCalledWith(
      3,
      ['config', 'set', 'account', 'previous-account'],
      'gcloud',
      true,
    );
  });

  test('It does not restore account if unchanged', async () => {
    process.env.GCLOUD_INSTALLED_VERSION = '400.0.0';
    execGcloud
      .mockResolvedValueOnce(JSON.stringify('same-account'))
      .mockResolvedValueOnce(JSON.stringify('same-account'))
      .mockResolvedValueOnce('');

    const callback = jest.fn();
    callback.mockResolvedValueOnce('callback-result');
    const result = await withGcloud('json-key', callback);
    expect(result).toEqual('callback-result');

    expect(execGcloud).toHaveBeenNthCalledWith(
      1,
      ['config', 'get', 'account', '--format=json'],
      'gcloud',
      true,
    );
    expect(setupGcloud).toHaveBeenCalledWith('json-key');
    expect(callback).toHaveBeenCalledWith('test-project');
    expect(execGcloud).toHaveBeenCalledTimes(2); // No restore call
  });
});
