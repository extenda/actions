jest.mock('@actions/core');
jest.mock('../src/configure-iam');
jest.mock('../src/iam-definition');
jest.mock('../src/iam-auth');
jest.mock('../src/load-credentials');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('fast-glob');

const core = require('@actions/core');
const fg = require('fast-glob');
const action = require('../src/index');
const configureIam = require('../src/configure-iam');
const fetchIamToken = require('../src/iam-auth');
const loadIamDefinition = require('../src/iam-definition');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const loadCredentials = require('../src/load-credentials');

const credentials = {
  styraToken: 'styra-token',
  iamApiEmail: 'iam-email',
  iamApiPassword: 'iam-pass',
  iamApiKey: 'iam-key',
  iamApiTenant: 'iam-tenant',
};

describe('run action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockResolvedValue('test-staging-332');
    loadCredentials.mockResolvedValue(credentials);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('iam.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('https://extendaretail.styra.com');
    loadIamDefinition.mockReturnValueOnce({});
    fg.sync.mockReturnValueOnce(['iam.yaml']);
    fetchIamToken.mockResolvedValue('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(fetchIamToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureIam).toHaveBeenNthCalledWith(1,
      {},
      'styra-token',
      'https://extendaretail.styra.com',
      'https://iam-api.retailsvc.com',
      'iam-token',
      'staging',
      'test-staging-332');
  });

  test('It can run for multiple files', async () => {
    setupGcloud.mockResolvedValue('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('iam/*.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('https://extendaretail.styra.com');
    loadIamDefinition.mockReturnValue({});
    fg.sync.mockReturnValueOnce(['iam/iam.yaml', 'iam/two.yaml']);
    fetchIamToken.mockResolvedValue('iam-token');
    await action();

    expect(loadIamDefinition).toHaveBeenCalledTimes(2);
  });
});
