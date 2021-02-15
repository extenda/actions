jest.mock('@actions/core');
jest.mock('../src/configure-grouptypes');
jest.mock('../src/grouptype-definition');
jest.mock('../../iam-test-token/src/iam-auth');
jest.mock('../../utils');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('fast-glob');
jest.mock('@actions/github');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../gcp-secret-manager/src/secrets');

const core = require('@actions/core');
const fg = require('fast-glob');
const action = require('../src/index');
const configureGroupTypes = require('../src/configure-grouptypes');
const fetchIamToken = require('../../iam-test-token/src/iam-auth');
const loadGroupTypeDefinition = require('../src/grouptype-definition');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const { loadCredentials } = require('../../utils');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
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
      .mockReturnValueOnce('https://business-unit-api.retailsvc.com');
    loadGroupTypeDefinition.mockReturnValueOnce({});
    fg.sync.mockReturnValueOnce(['iam.yaml']);
    fetchIamToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(fetchIamToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureGroupTypes).toHaveBeenNthCalledWith(1,
      {},
      'https://business-unit-api.retailsvc.com',
      '',
      'test-staging-332',
      true);
    expect(configureGroupTypes).toHaveBeenNthCalledWith(2,
      {},
      'https://business-unit-api.retailsvc.com',
      'iam-token',
      'test-prod-332',
      false);
  });

  test('It can run the action for IAM api correctly', async () => {
    loadSecret.mockResolvedValue('token');
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
      .mockReturnValueOnce('https://business-unit-api.retailsvc.com');
    loadGroupTypeDefinition.mockReturnValueOnce({});
    fg.sync.mockReturnValueOnce(['iam.yaml']);
    fetchIamToken.mockResolvedValueOnce('iam-token');
    fetchIamToken.mockResolvedValueOnce('iam-token');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(fetchIamToken).toHaveBeenCalledWith(
      'iam-key',
      'iam-email',
      'iam-pass',
      'iam-tenant',
    );
    expect(configureGroupTypes).toHaveBeenNthCalledWith(1,
      {},
      'https://iam-api.retailsvc.dev',
      'iam-token',
      'test-staging-332',
      false);
    expect(configureGroupTypes).toHaveBeenNthCalledWith(2,
      {},
      'https://iam-api.retailsvc.com',
      'iam-token',
      'test-prod-332',
      false);
  });

  test('It can run for multiple files', async () => {
    loadSecret.mockResolvedValue('token');
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
      .mockReturnValueOnce('https://business-unit-api.retailsvc.com');
    loadGroupTypeDefinition.mockReturnValue({});
    fg.sync.mockReturnValueOnce(['iam/iam.yaml', 'iam/two.yaml']);
    fetchIamToken.mockResolvedValue('iam-token');
    await action();

    expect(loadGroupTypeDefinition).toHaveBeenCalledTimes(2);
  });

  test('Dry-run stops after loading schema', async () => {
    setupGcloud.mockResolvedValue('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);
    core.getInput.mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('service-account-staging')
      .mockReturnValueOnce('service-account-prod')
      .mockReturnValueOnce('bum/*.yaml')
      .mockReturnValueOnce('https://business-unit-api.retailsvc.com')
      .mockReturnValueOnce('true');
    loadGroupTypeDefinition.mockReturnValue({});
    fg.sync.mockReturnValueOnce(['bum/grouptypes.yaml', 'bum/grouptypes2.yaml']);
    await action();

    expect(loadGroupTypeDefinition).toHaveBeenCalledTimes(2);
    expect(fetchIamToken).not.toHaveBeenCalled();
    expect(configureGroupTypes).not.toHaveBeenCalled();
  });
});
