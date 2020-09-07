jest.mock('@actions/core');
jest.mock('../src/configure-iam');
jest.mock('../src/iam-definition');
jest.mock('../src/iam-auth');

const core = require('@actions/core');
const action = require('../src/index');
const configureIam = require('../src/configure-iam');
const fetchToken = require('../src/iam-auth');
const loadIamDefinition = require('../src/iam-definition');

describe('run action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('iam.yaml')
      .mockReturnValueOnce('extendaretail')
      .mockReturnValueOnce('https://iam-api.retailsvc')
      .mockReturnValueOnce('styra-token')
      .mockReturnValueOnce('iam-email')
      .mockReturnValueOnce('iam-pass')
      .mockReturnValueOnce('iam-key')
      .mockReturnValueOnce('iam-tenant');
    loadIamDefinition.mockReturnValueOnce({});
    fetchToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(9);
    expect(fetchToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureIam).toHaveBeenCalledWith(
      'service-account',
      {},
      'styra-token',
      'extendaretail',
      'https://iam-api.retailsvc',
      'iam-token',
    );
  });
});
