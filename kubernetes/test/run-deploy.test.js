let fs = require('fs');

const mockFs = require('mock-fs');

fs = require('fs');

jest.mock('@actions/exec');
jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/project-info');
jest.mock('../../cloud-run/src/kubectl-auth');
jest.mock('../src/kustomize');
jest.mock('../src/patch-deployment-yaml', () => jest.fn((_service, yaml) => yaml));
jest.mock('../../utils', () => ({
  loadTool: jest.fn(),
}));

const exec = require('@actions/exec');
const clusterInfo = require('../../cloud-run/src/cluster-info');
const runDeploy = require('../src/run-deploy');
const kustomize = require('../src/kustomize');

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
    const fileSystem = {
      'src/kustomize': {
        'deployment.yml': 'kind: Deployment',
        'namespace.yml': 'kind: Namespace',
        'configmap.yml': 'kind: ConfigMap',
      },
      'extenda/test-repo': {},
    };
    mockFs(fileSystem);
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  test('It copies kustomize yaml files to repository', async () => {
    clusterInfo.mockResolvedValueOnce({});
    exec.exec.mockResolvedValue(0);
    await runDeploy(
      'service-account',
      {},
      'gcr.io/test-project/my-service:tag',
    );
    expect(fs.existsSync(`${process.env.GITHUB_WORKSPACE}/kustomize/deployment.yml`)).toEqual(true);
    expect(fs.existsSync(`${process.env.GITHUB_WORKSPACE}/kustomize/configmap.yml`)).toEqual(true);
    expect(fs.existsSync(`${process.env.GITHUB_WORKSPACE}/kustomize/namespace.yml`)).toEqual(true);
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
