jest.mock('@actions/core');
jest.mock('../src/iam-auth');
jest.mock('../../gcp-secret-manager/src/secrets');

const core = require('@actions/core');
const getIamToken = require('../src/iam-auth');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const action = require('../src/index');

describe('iam-test-token', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });
  test('It will fetch a token', async () => {
    core.getInput
      .mockReturnValueOnce('serviceAccountKey')
      .mockReturnValueOnce('email-secret')
      .mockReturnValueOnce('password-secret')
      .mockReturnValueOnce('api-key')
      .mockReturnValueOnce('tenant-id');

    getIamToken.mockResolvedValueOnce('secret-token');
    loadSecret.mockImplementation((serviceAccountKey, name) =>
      Promise.resolve(name),
    );
    await action();
    expect(loadSecret).toHaveBeenCalledTimes(2);
    expect(getIamToken).toHaveBeenCalledWith(
      'api-key',
      'email-secret',
      'password-secret',
      'tenant-id',
    );
    expect(core.setOutput).toHaveBeenCalledWith('iam-token', 'secret-token');
    expect(core.setSecret).toHaveBeenCalledWith('secret-token');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'IAM_TOKEN',
      'secret-token',
    );
  });

  test('It will use default input', async () => {
    core.getInput
      .mockReturnValueOnce('serviceAccountKey')
      .mockReturnValueOnce('iam-test-token-email')
      .mockReturnValueOnce('iam-test-token-password')
      .mockReturnValueOnce('api-key-test');

    getIamToken.mockResolvedValueOnce('secret-token');
    loadSecret.mockImplementation((serviceAccountKey, name) =>
      Promise.resolve(name),
    );
    await action();
    expect(loadSecret).toHaveBeenCalledTimes(2);
    expect(getIamToken).toHaveBeenCalledWith(
      'api-key-test',
      'iam-test-token-email',
      'iam-test-token-password',
      'testrunner-2mfuk',
    );
    expect(core.setOutput).toHaveBeenCalledWith('iam-token', 'secret-token');
    expect(core.setSecret).toHaveBeenCalledWith('secret-token');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'IAM_TOKEN',
      'secret-token',
    );
  });

  test('It will use email as input', async () => {
    core.getInput
      .mockReturnValueOnce('serviceAccountKey')
      .mockReturnValueOnce('email@test.com')
      .mockReturnValueOnce('api-key-test')
      .mockReturnValueOnce('password-secret');

    getIamToken.mockResolvedValueOnce('secret-token');
    loadSecret.mockImplementation((serviceAccountKey, name) =>
      Promise.resolve(name),
    );
    await action();
    expect(loadSecret).toHaveBeenCalledTimes(1);
    expect(getIamToken).toHaveBeenCalledWith(
      'password-secret',
      'email@test.com',
      'api-key-test',
      'testrunner-2mfuk',
    );
    expect(core.setOutput).toHaveBeenCalledWith('iam-token', 'secret-token');
    expect(core.setSecret).toHaveBeenCalledWith('secret-token');
    expect(core.exportVariable).toHaveBeenCalledWith(
      'IAM_TOKEN',
      'secret-token',
    );
  });
});
