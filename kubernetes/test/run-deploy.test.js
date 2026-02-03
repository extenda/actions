jest.mock('@actions/exec');
jest.mock('../../setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/kubectl-auth');
jest.mock('../src/check-namespace-exists');
jest.mock('../src/check-number-of-pods-running');
jest.mock('../src/patch-deployment-yaml');
jest.mock('../src/patch-service-yaml');
jest.mock('../src/patch-statefulset-yaml');
jest.mock('../src/kustomize');
jest.mock('../src/apply-kubectl');
jest.mock('../src/autoscale');
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
  getImageDigest: jest.fn(),
}));

import * as exec from '@actions/exec';
import mockFs from 'mock-fs';

import { getClusterInfo } from '../../cloud-run/src/cluster-info.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { getImageDigest } from '../../utils';
import applyKubectl from '../src/apply-kubectl.js';
import applyAutoscale from '../src/autoscale.js';
import checkNamespaceExists from '../src/check-namespace-exists.js';
import checkRequiredNumberOfPodsIsRunning from '../src/check-number-of-pods-running.js';
import kustomize from '../src/kustomize.js';
import patchDeployment from '../src/patch-deployment-yaml.js';
import patchServiceYaml from '../src/patch-service-yaml.js';
import patchStatefulSetYaml from '../src/patch-statefulset-yaml.js';
import runDeploy from '../src/run-deploy.js';

const orgEnv = process.env;

describe('Run Deploy', () => {
  beforeAll(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_WORKSPACE = 'extenda/test-repo';
  });

  afterAll(() => {
    process.env = orgEnv;
  });

  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It calls check namespace exists', async () => {
    getClusterInfo.mockResolvedValueOnce({
      project: 'project',
      cluster: 'cluster',
      clusterLocation: 'cluster-location',
    });
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');
    getImageDigest.mockResolvedValueOnce(
      'eu.gcr.io/test-project/my-service@sha256:111',
    );
    const image = 'eu.gcr.io/test-project/my-service:tag';
    const name = 'deployment-name';
    await runDeploy('service-account', { name }, image);

    expect(checkNamespaceExists).toHaveBeenCalledWith('deployment-name');
  });

  test('It calls patchService', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');

    const service = {
      name: 'service-name',
      ports: [
        {
          protocol: 'TCP',
          port: 80,
          targetPort: 8080,
        },
      ],
    };
    const image = 'eu.gcr.io/test-project/my-service:tag';
    await runDeploy('service-account', service, image);

    expect(patchServiceYaml).toHaveBeenCalledWith(service, expect.anything());
  });

  test('It will deploy StatefulSet when storage is defined', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');

    const dryRun = undefined;
    const service = {
      name: 'deployment-name',
      storage: {
        volume: '5Mi',
        mountPath: '/data/storage',
      },
    };
    const image = 'eu.gcr.io/test-project/my-service:tag';
    await runDeploy('service-account', service, image);

    expect(patchStatefulSetYaml).toHaveBeenCalledWith(
      service,
      expect.anything(),
    );
    expect(kustomize).toHaveBeenCalledWith([
      'edit',
      'add',
      'resource',
      'statefulSet.yml',
    ]);
    expect(applyKubectl).toHaveBeenCalledWith(
      expect.anything(),
      'statefulset',
      dryRun,
    );
  });

  test('It will deploy Deployment when storage is not required', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');

    const dryRun = undefined;
    const service = {
      name: 'deployment-name',
      storage: undefined,
    };
    const image = 'eu.gcr.io/test-project/my-service:tag';
    await runDeploy('service-account', service, image);

    expect(patchDeployment).toHaveBeenCalledWith(service, expect.anything());
    expect(kustomize).toHaveBeenCalledWith([
      'edit',
      'add',
      'resource',
      'deployment.yml',
    ]);
    expect(applyKubectl).toHaveBeenCalledWith(
      expect.anything(),
      'deployment',
      dryRun,
    );
  });

  test('It calls kustomize on yaml files and build', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');
    getImageDigest.mockResolvedValueOnce(
      'eu.gcr.io/test-project/my-service@sha256:111',
    );

    const image = 'eu.gcr.io/test-project/my-service:tag';
    const name = 'deployment-name';
    await runDeploy('service-account', { name }, image);
    expect(kustomize).toHaveBeenNthCalledWith(2, [
      'edit',
      'set',
      'namespace',
      name,
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(3, [
      'edit',
      'set',
      'image',
      'eu.gcr.io/extenda/IMAGE:TAG=eu.gcr.io/test-project/my-service@sha256:111',
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(4, [
      'edit',
      'add',
      'label',
      `app:${name}`,
    ]);
    expect(kustomize).toHaveBeenLastCalledWith(['build']);
  });

  test('It calls applyAutoscale with storage (stateful set), autoscale parameters and dryRun', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');

    const image = 'eu.gcr.io/test-project/my-service:tag';
    const service = {
      name: 'deployment-name',
      storage: {
        volume: '5Mi',
        mountPath: '/data/storage',
      },
      replicas: 1,
      autoscale: {
        minReplicas: 1,
        maxReplicas: 6,
      },
    };
    const dryRun = true;

    await runDeploy('service-account', service, image, dryRun);

    expect(applyAutoscale).toHaveBeenCalledWith(
      service.name,
      'statefulset',
      service.autoscale,
      service.replicas,
      dryRun,
    );
  });

  test('It calls applyAutoscale without storage, autoscale parameters and dryRun', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    setupGcloud.mockResolvedValueOnce('test-staging-project');

    const image = 'eu.gcr.io/test-project/my-service:tag';
    const service = {
      name: 'deployment-name',
      replicas: 1,
    };
    const dryRun = undefined;

    await runDeploy('service-account', service, image, dryRun);

    expect(applyAutoscale).toHaveBeenCalledWith(
      service.name,
      'deployment',
      undefined,
      service.replicas,
      dryRun,
    );
    expect(checkRequiredNumberOfPodsIsRunning).toHaveBeenCalledTimes(1);
  });
});
