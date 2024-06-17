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
const { sendScaleSetup, sendDeployInfo } = require('../src/utils/send-request');
const runScan = require('../src/utils/vulnerability-scanning');
const { checkPolicyExists, checkPolicyTarget, setCloudArmorPolicyTarget } = require('../src/loadbalancing/external/cloud-armor');

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
jest.mock('../src/utils/send-request');
jest.mock('../src/utils/vulnerability-scanning');
jest.mock('../src/loadbalancing/external/cloud-armor');

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
const serviceDefNoInternal = {
  kubernetes: {
    type: 'Deployment',
    service: 'service-name',
    'internal-traffic': false,
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

//'job-trigger': 'https://github.com/example-organization/example-repository/actions/runs/example-run-id/attempts/1',
process.env.GITHUB_SERVER_URL = 'https://github.com/example-organization';
process.env.GITHUB_REPOSITORY = 'example-repository';
process.env.GITHUB_RUN_ID = 'example-run-id';
process.env.GITHUB_RUN_ATTEMPT = '1';
const githubServerUrl = process.env.GITHUB_SERVER_URL;
const githubRepository = process.env.GITHUB_REPOSITORY;
const githubRunID = process.env.GITHUB_RUN_ID;
const githubRunAttempt = process.env.GITHUB_RUN_ATTEMPT;
const jobTrigger = `${ githubServerUrl }/${ githubRepository }/actions/runs/${ githubRunID }/attempts/${ githubRunAttempt }`.toLowerCase();
const basemetadata = {
  baseAnnotations: {
    'job-trigger': `${jobTrigger}`,
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
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

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
      300,
      'envoy-certs',
      'internal-cert',
      'internal-key',
      'clan-service-account',
      basemetadata,
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
      true,
    );
  });
  test('It can fail the action', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert')
      .mockResolvedValueOnce(basemetadata);

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
      300,
      'envoy-certs',
      'internal-cert',
      'internal-key',
      'clan-service-account',
      basemetadata,
    );
  });
  test('It can run the action without internal traffic', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    loadServiceDefinition.mockReturnValueOnce(serviceDefNoInternal);
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
    expect(publishPolicies).toHaveBeenCalledWith('service-name', 'staging', 'tag', serviceDefNoInternal);
    expect(buildManifest).toHaveBeenCalledWith(
      'gcr.io/project/image@sha256:1',
      serviceDefNoInternal,
      'project-id',
      'clan-name',
      'staging',
      300,
      'envoy-certs',
      'internal-cert',
      'internal-key',
      'clan-service-account',
      basemetadata,
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
    expect(configureInternalFrontend).not.toHaveBeenCalled();
  });

  test('It will throw error if consumers are set for kubernetes', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    const serviceDefconsumers = {
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
      security: {
        consumers: {
          'service-accounts': ['some-account'],
          audiences: ['some-audience'],
        },
      },
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

    loadServiceDefinition.mockReturnValueOnce(serviceDefconsumers);
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
    await expect(action()).rejects.toThrow('Consumers security configuration is only for cloud-run');
  });

  test('It will setup scaling schedule', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    const serviceDefconsumers = {
      'cloud-run': {
        service: 'service-name',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          concurrency: 40,
          schedule: [{
            'scale-hours': '08:00-20:00',
          }],
        },
      },
      security: {
        consumers: {
          'service-accounts': ['some-account'],
          audiences: ['some-audience'],
        },
      },
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

    loadServiceDefinition.mockReturnValueOnce(serviceDefconsumers);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'prod',
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
    runScan.mockResolvedValueOnce();
    await action();
    expect(sendScaleSetup).toHaveBeenCalledTimes(1);
    expect(sendDeployInfo).toHaveBeenCalledTimes(1);
  });

  test('It will setup cloud armor policy', async () => {
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials.mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    const serviceDefconsumers = {
      'cloud-run': {
        service: 'service-name',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          concurrency: 40,
          schedule: [{
            'scale-hours': '08:00-20:00',
          }],
        },
      },
      security: {
        consumers: {
          'service-accounts': ['some-account'],
          audiences: ['some-audience'],
        },
        'cloud-armor': {
          'policy-name': 'test-policy',
        },
      },
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
          'domain-mappings': ['example.com'],
        },
        staging: {
          'min-instances': 1,
          'max-instances': 1,
          env: {},
          'domain-mappings': ['example.com'],
        },
      },
    };

    loadServiceDefinition.mockReturnValueOnce(serviceDefconsumers);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'prod',
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
    runScan.mockResolvedValueOnce();
    checkPolicyExists.mockResolvedValueOnce();
    checkPolicyTarget.mockResolvedValueOnce(false);
    setCloudArmorPolicyTarget.mockResolvedValueOnce();
    await action();
    expect(checkPolicyExists).toHaveBeenCalledTimes(1);
    expect(checkPolicyTarget).toHaveBeenCalledTimes(1);
    expect(setCloudArmorPolicyTarget).toHaveBeenCalledTimes(1);
  });
});
