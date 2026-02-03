jest.mock('@actions/core');
jest.mock('../src/configure-iam');
jest.mock('../src/configure-bundle-sync');
jest.mock('../src/iam-definition');
jest.mock('../../iam-test-token/src/iam-auth');
jest.mock('../src/load-credentials');
jest.mock('../../setup-gcloud');
jest.mock('fast-glob');
jest.mock('@actions/github');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../gcp-secret-manager/src/secrets');

import core from '@actions/core';
import fg from 'fast-glob';

import { getClusterInfo } from '../../cloud-run/src/cluster-info';
import fetchIamToken from '../../iam-test-token/src/iam-auth';
import { setupGcloud } from '../../setup-gcloud';
import configureBundleSync from '../src/configure-bundle-sync';
import { configureIAM } from '../src/configure-iam';
import loadIamDefinition from '../src/iam-definition';
import action from '../src/index';
import loadCredentials from '../src/load-credentials';

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
    setupGcloud.mockResolvedValueOnce('test-staging-332');
    setupGcloud.mockResolvedValueOnce('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);

    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValueOnce(clusterInfoResponse);
    core.getInput
      .mockReturnValueOnce('service-account')
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
    expect(configureBundleSync).toHaveBeenNthCalledWith(1, {}, 'staging');
    expect(configureIAM).toHaveBeenNthCalledWith(
      1,
      {},
      'https://iam-api.retailsvc.com',
      '',
      true,
    );
    expect(configureBundleSync).toHaveBeenNthCalledWith(2, {}, 'prod');
    expect(configureIAM).toHaveBeenNthCalledWith(
      2,
      {},
      'https://iam-api.retailsvc.com',
      'iam-token',
      false,
    );
  });

  test('It can run the action for IAM api correctly', async () => {
    setupGcloud.mockResolvedValueOnce('test-staging-332');
    setupGcloud.mockResolvedValueOnce('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);

    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValueOnce(clusterInfoResponse);
    core.getInput
      .mockReturnValueOnce('service-account')
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
    expect(configureBundleSync).toHaveBeenNthCalledWith(1, {}, 'staging');
    expect(configureIAM).toHaveBeenNthCalledWith(
      1,
      {},
      'https://iam-api.retailsvc.dev',
      'iam-token',
      false,
    );
    expect(configureBundleSync).toHaveBeenNthCalledWith(2, {}, 'prod');
    expect(configureIAM).toHaveBeenNthCalledWith(
      2,
      {},
      'https://iam-api.retailsvc.com',
      'iam-token',
      false,
    );
  });

  test('It can run for multiple files', async () => {
    const clusterInfoResponse = {
      project: 'tribe-prod-1242',
    };

    getClusterInfo.mockReturnValue(clusterInfoResponse);

    setupGcloud.mockResolvedValue('test-prod-332');
    loadCredentials.mockResolvedValue(credentials);
    core.getInput
      .mockReturnValueOnce('service-account')
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
    core.getInput
      .mockReturnValueOnce('service-account')
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
    expect(configureIAM).not.toHaveBeenCalled();
  });
});
