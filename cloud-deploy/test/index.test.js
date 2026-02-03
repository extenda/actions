import * as core from '@actions/core';
import { afterEach, describe, expect, test, vi } from 'vitest';

import projectInfo from '../../cloud-run/src/project-info.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import action from '../src/index.js';
import buildManifest from '../src/manifests/build-manifest.js';
import deploy from '../src/manifests/deploy.js';
import getImageWithSha256 from '../src/manifests/image-sha256.js';
import publishPolicies from '../src/policies/publish-policies.js';
import loadCredentials from '../src/utils/load-credentials.js';
import { sendDeployInfo, sendScaleSetup } from '../src/utils/send-request.js';
import loadServiceDefinition from '../src/utils/service-definition.js';
import runScan from '../src/utils/vulnerability-scanning.js';

vi.mock('../src/utils/load-credentials.js');
vi.mock('@actions/core');
vi.mock('../src/utils/service-definition.js');
vi.mock('../src/manifests/deploy.js');
vi.mock('../src/manifests/build-manifest.js');
vi.mock('../../cloud-run/src/project-info.js');
vi.mock('../../utils/src');
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../src/manifests/image-sha256.js');
vi.mock('../src/policies/publish-policies.js');
vi.mock('../src/utils/send-request.js');
vi.mock('../src/utils/vulnerability-scanning.js');
vi.mock('../src/utils/cloud-armor.js');

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
    vi.resetAllMocks();
  });

  test('It can run the action', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials
      .mockResolvedValueOnce('envoy-certs')
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
    setupGcloud.mockResolvedValueOnce('project-id');
    publishPolicies.mockResolvedValueOnce();
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(publishPolicies).toHaveBeenCalledWith(
      'service-name',
      'staging',
      'tag',
      serviceDef,
    );
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
    );
  });
  test('It can fail the action', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials
      .mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    loadServiceDefinition.mockReturnValueOnce(serviceDef);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'staging',
    });
    buildManifest.mockResolvedValueOnce();
    deploy.mockResolvedValueOnce(false);
    setupGcloud.mockResolvedValueOnce('project-id');

    await expect(action()).rejects.toThrow(
      'Deployment failed! Check container logs and status for error!',
    );
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
    );
  });

  test('It will throw error if consumers are set for kubernetes', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials
      .mockResolvedValueOnce('envoy-certs')
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
    setupGcloud.mockResolvedValueOnce('project-id');
    publishPolicies.mockResolvedValueOnce();
    await expect(action()).rejects.toThrow(
      'Consumers security configuration is only for cloud-run',
    );
  });

  test('It will setup scaling schedule', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials
      .mockResolvedValueOnce('envoy-certs')
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
          schedule: [
            {
              'scale-hours': '08:00-20:00',
            },
          ],
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
    setupGcloud.mockResolvedValueOnce('project-id');
    publishPolicies.mockResolvedValueOnce();
    runScan.mockResolvedValueOnce();
    await action();
    expect(sendScaleSetup).toHaveBeenCalledTimes(1);
    expect(sendDeployInfo).toHaveBeenCalledTimes(1);
  });

  test('It will send loadbalancer deploy request', async () => {
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('clan-service-account')
      .mockReturnValueOnce('cloud-run.yaml')
      .mockReturnValueOnce('gcr.io/project/image:tag');
    loadCredentials
      .mockResolvedValueOnce('envoy-certs')
      .mockResolvedValueOnce('internal-key')
      .mockResolvedValueOnce('internal-cert');

    const serviceDefPathmappings = {
      'cloud-run': {
        service: 'service-name',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          concurrency: 40,
          schedule: [
            {
              'scale-hours': '08:00-20:00',
            },
          ],
        },
        'request-logs': {
          'cloud-run': false,
          'load-balancer': true,
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
          'domain-mappings': ['example.com'],
          'path-mappings': [
            {
              paths: ['/login/*'],
              service: 'some-service',
              'path-rewrite': '/',
            },
            {
              paths: ['/bucket/*'],
              bucket: 'some-bucket',
              'path-rewrite': '/',
            },
          ],
        },
        staging: {
          'min-instances': 1,
          'max-instances': 1,
          env: {},
          'domain-mappings': ['example.com'],
        },
      },
    };

    loadServiceDefinition.mockReturnValueOnce(serviceDefPathmappings);
    getImageWithSha256.mockResolvedValueOnce('gcr.io/project/image@sha256:1');
    projectInfo.mockReturnValueOnce({
      project: 'clan-name',
      env: 'prod',
    });
    buildManifest.mockResolvedValueOnce();
    deploy.mockResolvedValueOnce(true);
    setupGcloud.mockResolvedValueOnce('project-id');
    publishPolicies.mockResolvedValueOnce();
    runScan.mockResolvedValueOnce();
    await action();
    expect(sendScaleSetup).toHaveBeenCalledTimes(1);
    expect(sendDeployInfo).toHaveBeenCalledTimes(1);
  });
});
