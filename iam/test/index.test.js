jest.mock('@actions/core');
jest.mock('../src/configure-iam');
jest.mock('../src/iam-definition');
jest.mock('../../iam-test-token/src/iam-auth');
jest.mock('../src/load-credentials');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('fast-glob');
jest.mock('@actions/github');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../src/system-owners');
jest.mock('../../gcp-secret-manager/src/secrets');

const core = require('@actions/core');
const fg = require('fast-glob');
const action = require('../src/index');
const configureIam = require('../src/configure-iam');
const fetchIamToken = require('../../iam-test-token/src/iam-auth');
const loadIamDefinition = require('../src/iam-definition');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const loadCredentials = require('../src/load-credentials');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const getSystemOwners = require('../src/system-owners');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

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
    loadSecret.mockResolvedValue('token');
    getSystemOwners.mockResolvedValueOnce(['test@mail.com']);
    setupGcloud.mockResolvedValueOnce('test-staging-332');
    setupGcloud.mockResolvedValueOnce('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);

    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValueOnce(clusterInfoResponse);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('iam.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('https://extendaretail.styra.com');
    loadIamDefinition.mockReturnValueOnce({});
    fg.sync.mockReturnValueOnce(['iam.yaml']);
    fetchIamToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(8);
    expect(fetchIamToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureIam).toHaveBeenNthCalledWith(
      1,
      {},
      'styra-token',
      'https://extendaretail.styra.com',
      'https://iam-api.retailsvc.com',
      '',
      'staging',
      'test-staging-332',
      ['test@mail.com'],
      true,
    );
    expect(configureIam).toHaveBeenNthCalledWith(
      2,
      {},
      'styra-token',
      'https://extendaretail.styra.com',
      'https://iam-api.retailsvc.com',
      'iam-token',
      'prod',
      'test-prod-332',
      ['test@mail.com'],
      false,
    );
  });

  test('It can run the action for IAM api correctly', async () => {
    loadSecret.mockResolvedValue('token');
    getSystemOwners.mockResolvedValueOnce(['test@mail.com']);
    setupGcloud.mockResolvedValueOnce('test-staging-332');
    setupGcloud.mockResolvedValueOnce('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);

    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValueOnce(clusterInfoResponse);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('iam.yaml')
      .mockReturnValueOnce('https://iam-api.retailsvc.dev')
      .mockReturnValueOnce('https://extendaretail.styra.com');
    loadIamDefinition.mockReturnValueOnce({});
    fg.sync.mockReturnValueOnce(['iam.yaml']);
    fetchIamToken.mockResolvedValueOnce('iam-token');
    fetchIamToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(8);
    expect(fetchIamToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureIam).toHaveBeenNthCalledWith(
      1,
      {},
      'styra-token',
      'https://extendaretail.styra.com',
      'https://iam-api.retailsvc.dev',
      'iam-token',
      'staging',
      'test-staging-332',
      ['test@mail.com'],
      false,
    );
    expect(configureIam).toHaveBeenNthCalledWith(
      2,
      {},
      'styra-token',
      'https://extendaretail.styra.com',
      'https://iam-api.retailsvc.com',
      'iam-token',
      'prod',
      'test-prod-332',
      ['test@mail.com'],
      false,
    );
  });

  test('It can run for multiple files', async () => {
    loadSecret.mockResolvedValue('token');
    getSystemOwners.mockResolvedValueOnce(['test@mail.com']);
    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValue(clusterInfoResponse);

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

  test('Dry-run stops after loading schema', async () => {
    setupGcloud.mockResolvedValue('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('iam/*.yaml')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('https://extendaretail.styra.com')
      .mockReturnValueOnce('true');
    loadIamDefinition.mockReturnValue({});
    fg.sync.mockReturnValueOnce(['iam/iam.yaml', 'iam/two.yaml']);
    await action();

    expect(loadIamDefinition).toHaveBeenCalledTimes(2);
    expect(fetchIamToken).not.toHaveBeenCalled();
    expect(configureIam).not.toHaveBeenCalled();
  });
});
