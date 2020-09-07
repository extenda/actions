jest.mock('@actions/core');
jest.mock('../src/configure-iam');
jest.mock('../src/iam-definition');
jest.mock('../src/iam-auth');
jest.mock('../src/load-credentials');
jest.mock('../../setup-gcloud/src/setup-gcloud');


const core = require('@actions/core');
const action = require('../src/index');
const configureIam = require('../src/configure-iam');
const fetchToken = require('../src/iam-auth');
const loadIamDefinition = require('../src/iam-definition');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const loadCredentials = require('../src/load-credentials');


describe('run action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    const credentials = {
      styraToken: 'styra-token',
      iamApiEmail: 'iam-email',
      iamApiPassword: 'iam-pass',
      iamApiKey: 'iam-key',
      iamApiTenant: 'iam-tenant',
    };

    setupGcloud.mockResolvedValueOnce('test-staging-332');
    loadCredentials.mockResolvedValueOnce(credentials);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('iam.yaml')
      .mockReturnValueOnce('extendaretail')
      .mockReturnValueOnce('https://iam-api.retailsvc.dev');
    loadIamDefinition.mockReturnValueOnce({});
    fetchToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(fetchToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureIam).toHaveBeenCalledWith(
      {},
      'styra-token',
      'extendaretail',
      'https://iam-api.retailsvc.dev',
      'iam-token',
      'staging',
    );
  });
});
