jest.mock('@actions/exec');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/kubectl-auth');
jest.mock('../../cloud-run/src/create-namespace');
jest.mock('../src/kustomize');
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

const exec = require('@actions/exec');
const mockFs = require('mock-fs');
const clusterInfo = require('../../cloud-run/src/cluster-info');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const runDeploy = require('../src/run-deploy');
const kustomize = require('../src/kustomize');
const createNamespace = require('../../cloud-run/src/create-namespace');

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
    clusterInfo.mockResolvedValueOnce({
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
      'hiiretail-deployment-name',
    );
  });

  test('It calls kustomize on yaml files and build', async () => {
    clusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    const image = 'gcr.io/test-project/my-service:tag';
    const name = 'deployment-name';
    await runDeploy(
      'service-account',
      { name },
      image,
    );
    expect(kustomize).toHaveBeenNthCalledWith(1, [
      'edit',
      'set',
      'namespace',
      `hiiretail-${name}`,
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(2, [
      'edit',
      'set',
      'image',
      `eu.gcr.io/extenda/IMAGE:TAG=${image}`,
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(3, [
      'edit',
      'add',
      'label',
      `app:${name}`,
    ]);
    expect(kustomize).toHaveBeenNthCalledWith(4, [
      'edit',
      'set',
      'namesuffix',
      '--',
      `-${name}`,
    ]);
    expect(kustomize).toHaveBeenLastCalledWith([
      'build',
    ]);
  });
});
