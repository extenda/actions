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
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const action = require('../src/index');

jest.mock('@actions/core');
jest.mock('../src/utils/service-definition');
jest.mock('../src/utils/cloud-run-schema');
jest.mock('../src/manifests/deploy');
jest.mock('../src/manifests/build-manifest');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../src/loadbalancing/external/create-external-loadbalancer');
jest.mock('../src/loadbalancing/internal/create-internal-backend');
jest.mock('../src/loadbalancing/external/create-external-backend');
jest.mock('../src/loadbalancing/external/create-external-frontend');
jest.mock('../src/loadbalancing/internal/create-internal-frontend');
jest.mock('../../utils');
jest.mock('../../setup-gcloud/src/setup-gcloud');

describe('Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    const serviceDef = {
      platform: {
        gke: {
          'domain-mappings': {
            staging: ['example.com'],
            prod: ['example.com'],
          },
        },
      },
      name: 'service-name',
    };

    loadServiceDefinition.mockReturnValueOnce(serviceDef);
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
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(buildManifest).toHaveBeenCalledWith(
      'gcr.io/project/image:tag',
      serviceDef,
      'project-id',
      'clan-name',
      'staging',
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
    );
  });
  test('It can fail the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    const serviceDef = {
      platform: {
        gke: {
          'domain-mappings': {
            staging: ['example.com'],
            prod: ['example.com'],
          },
        },
      },
      name: 'service-name',
    };

    loadServiceDefinition.mockReturnValueOnce(serviceDef);
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'staging',
    });
    buildManifest.mockResolvedValueOnce();
    deploy.mockResolvedValueOnce(false);
    setupGcloud.mockResolvedValueOnce('project-id');

    await expect(action()).rejects.toThrow('Deployment failed! Check container logs and status for error!');
    expect(core.getInput).toHaveBeenCalledTimes(4);
    expect(buildManifest).toHaveBeenCalledWith(
      'gcr.io/project/image:tag',
      serviceDef,
      'project-id',
      'clan-name',
      'staging',
    );
  });
});
