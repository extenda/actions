jest.mock('@actions/exec');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/kubectl-auth');
jest.mock('../../cloud-run/src/create-namespace');
jest.mock('../src/patch-deployment-yaml');
jest.mock('../src/patch-statefulset-yaml');
jest.mock('../src/kustomize');
jest.mock('../src/apply-kubectl');
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

const exec = require('@actions/exec');
const mockFs = require('mock-fs');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const patchDeployment = require('../src/patch-deployment-yaml');
const patchStatefulSet = require('../src/patch-statefulset-yaml');
const runDeploy = require('../src/run-deploy');
const kustomize = require('../src/kustomize');
const createNamespace = require('../../cloud-run/src/create-namespace');
const applyKubectl = require('../src/apply-kubectl');

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

  test('It calls create namespace', async () => {
    getClusterInfo.mockResolvedValueOnce({
      project: 'project',
      cluster: 'cluster',
      clusterLocation: 'cluster-location',
    });
    setupGcloud.mockResolvedValueOnce('project-id');
    exec.exec.mockResolvedValue(0);
    const image = 'gcr.io/test-project/my-service:tag';
    const name = 'deployment-name';
    await runDeploy(
      'service-account',
      { name },
      image,
    );

    expect(createNamespace).toHaveBeenCalledWith(
      'project-id',
      'skip',
      { cluster: 'cluster', clusterLocation: 'cluster-location', project: 'project' },
      'deployment-name',
    );
  });

  test('It will deploy StatefulSet when storage is defined', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);

    const dryRun = undefined;
    const service = {
      name: 'deployment-name',
      storage: {
        volume: '5Mi',
        mountPath: '/data/storage',
      },
    };
    const image = 'gcr.io/test-project/my-service:tag';
    await runDeploy(
      'service-account',
      service,
      image,
    );

    expect(patchStatefulSet).toHaveBeenCalledWith(service, expect.anything());
    expect(kustomize).toHaveBeenCalledWith([
      'edit',
      'add',
      'resource',
      'statefulSet.yml',
    ]);
    expect(applyKubectl).toHaveBeenCalledWith(expect.anything(), 'statefulset', dryRun);
  });

  test('It will deploy Deployment when storage is not required', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);

    const dryRun = undefined;
    const service = {
      name: 'deployment-name',
      storage: undefined,
    };
    const image = 'gcr.io/test-project/my-service:tag';
    await runDeploy(
      'service-account',
      service,
      image,
    );

    expect(patchDeployment).toHaveBeenCalledWith(service, expect.anything());
    expect(kustomize).toHaveBeenCalledWith([
      'edit',
      'add',
      'resource',
      'deployment.yml',
    ]);
    expect(applyKubectl).toHaveBeenCalledWith(expect.anything(), 'deployment', dryRun);
  });

  test('It calls kustomize on yaml files and build', async () => {
    getClusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    const image = 'gcr.io/test-project/my-service:tag';
    const name = 'deployment-name';
    await runDeploy(
      'service-account',
      { name },
      image,
    );
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
      `eu.gcr.io/extenda/IMAGE:TAG=${image}`,
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(4, [
      'edit',
      'add',
      'label',
      `app:${name}`,
    ]);
    expect(kustomize).toHaveBeenLastCalledWith([
      'build',
    ]);
  });
});
