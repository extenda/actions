jest.mock('@actions/core');
jest.mock('../src/iam-auth');
jest.mock('../../gcp-secret-manager/src/secrets');

const core = require('@actions/core');
const getIamToken = require('../src/iam-auth');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const action = require('../src/index');

describe('iam-test-token', () => {
  test('It will fetch a token', async () => {
    core.getInput.mockReturnValueOnce('serviceAccountKey');
    getIamToken.mockResolvedValueOnce('secret-token');
    loadSecret.mockImplementation((serviceAccountKey, name) => Promise.resolve(name));
    await action();
    expect(loadSecret).toHaveBeenCalledTimes(4);
    expect(getIamToken).toHaveBeenCalledWith(
      'iam-api-key-prod',
      'iam-api-email-prod',
      'iam-api-password-prod',
      'iam-api-tenantId-prod',
    );
    expect(core.setOutput).toHaveBeenCalledWith('iam-token', 'secret-token');
    expect(core.setSecret).toHaveBeenCalledWith('secret-token');
    expect(core.exportVariable).toHaveBeenCalledWith('IAM_TOKEN', 'secret-token');
  });
});
