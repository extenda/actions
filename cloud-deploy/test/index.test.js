const core = require('@actions/core');
const buildManifest = require('../src/manifests/build-manifest');
const loadServiceDefinition = require('../src/utils/service-definition');
const deploy = require('../src/manifests/deploy');
const projectInfo = require('../../cloud-run/src/project-info');
const createExternalLoadbalancer = require('../src/loadbalancing/external/create-external-loadbalancer');
const configureInternalDomain = require('../src/loadbalancing/internal/create-internal-backend');
const configureExternalDomain = require('../src/loadbalancing/external/create-external-backend');
const configureExternalLBFrontend = require('../src/loadbalancing/external/create-external-frontend');
const configureInternalFrontend = require('../src/loadbalancing/internal/create-internal-frontend');
const { setupGcloud } = require('../../setup-gcloud');
const action = require('../src/index');
const loadCredentials = require('../src/utils/load-credentials');
const getImageWithSha256 = require('../src/manifests/image-sha256');
const publishPolicies = require('../src/policies/publish-policies');

jest.mock('../src/utils/load-credentials');
jest.mock('@actions/core');
jest.mock('../src/utils/service-definition');
jest.mock('../src/manifests/deploy');
jest.mock('../src/manifests/build-manifest');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../src/loadbalancing/external/create-external-loadbalancer');
jest.mock('../src/loadbalancing/internal/create-internal-backend');
jest.mock('../src/loadbalancing/external/create-external-backend');
jest.mock('../src/loadbalancing/external/create-external-frontend');
jest.mock('../src/loadbalancing/internal/create-internal-frontend');
jest.mock('../../utils');
jest.mock('../../setup-gcloud');
jest.mock('../src/manifests/image-sha256');
jest.mock('../src/policies/publish-policies');

const serviceDef = {
  kubernetes: {
    type: 'Deployment',
    service: 'service-name',
    resources: {
      cpu: 1,
      memory: '512Mi',
    },
    protocol: 'http',
    scaling: {
      cpu: 40,
    },
  },
  security: 'none',
  labels: {
    product: 'actions',
    component: 'jest',
  },
  environments: {
    production: {
      'min-instances': 1,
      'max-instances': 10,
      env: {
        KEY1: 'value1',
        KEY2: 'value2',
      },
    },
    staging: {
      'min-instances': 1,
      'max-instances': 1,
      env: {},
      'domain-mappings': ['example.com'],
    },
  },
};

describe('Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('styra-token')
      .mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert')
      .mockResolvedValueOnce('external-cert')
      .mockResolvedValueOnce('external-key');

    loadServiceDefinition.mockReturnValueOnce(serviceDef);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'staging',
    });
    buildManifest.mockResolvedValueOnce();
    deploy.mockResolvedValueOnce(true);
    createExternalLoadbalancer.mockResolvedValueOnce();
    configureExternalLBFrontend.mockResolvedValueOnce();
    configureExternalDomain.mockResolvedValueOnce();
    configureInternalDomain.mockResolvedValueOnce();
    configureInternalFrontend.mockResolvedValueOnce();
    setupGcloud.mockResolvedValueOnce('project-id');
    publishPolicies.mockResolvedValueOnce();
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(publishPolicies).toHaveBeenCalledWith('service-name', 'staging', 'tag', serviceDef);
    expect(buildManifest).toHaveBeenCalledWith(
      'gcr.io/project/image@sha256:1',
      serviceDef,
      'project-id',
      'clan-name',
      'staging',
      'styra-token',
      300,
      'envoy-certs',
      'internal-cert',
      'internal-key',
      'external-cert',
      'external-key',
      'clan-service-account',
    );
    expect(createExternalLoadbalancer).toHaveBeenCalledWith(
      'project-id',
      'staging',
    );
    expect(configureExternalLBFrontend).toHaveBeenCalledWith(
      'project-id',
      'staging',
      ['example.com'],
      false,
    );
    expect(configureInternalFrontend).toHaveBeenCalledWith(
      'project-id',
      'service-name',
      'staging',
      'http',
    );
  });
  test('It can fail the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('styra-token')
      .mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert')
      .mockResolvedValueOnce('external-cert')
      .mockResolvedValueOnce('external-key');

    loadServiceDefinition.mockReturnValueOnce(serviceDef);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'staging',
    });
    buildManifest.mockResolvedValueOnce();
    deploy.mockResolvedValueOnce(false);
    setupGcloud.mockResolvedValueOnce('project-id');

    await expect(action()).rejects.toThrow('Deployment failed! Check container logs and status for error!');
    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(buildManifest).toHaveBeenCalledWith(
      'gcr.io/project/image@sha256:1',
      serviceDef,
      'project-id',
      'clan-name',
      'staging',
      'styra-token',
      300,
      'envoy-certs',
      'internal-cert',
      'internal-key',
      'external-cert',
      'external-key',
      'clan-service-account',
    );
  });
});
