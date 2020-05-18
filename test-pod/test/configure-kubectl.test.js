const mockFs = require('mock-fs');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const getClusterInfo = require('../../cloud-run/src/cluster-info');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');

jest.mock('../../setup-gcloud/src/setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/kubectl-auth');

const configureKubeCtl = require('../src/configure-kubectl');

const noClusterYaml = `
name: my-test
cpu: 200m
memory: 256Mi
platform:
  gke:
    connectivity: internal
`;

const clusterYaml = `
name: my-test
cpu: 200m
memory: 256Mi
platform:
  gke:
    connectivity: internal
    cluster: projects/gke-project/zones/europe-west1/clusters/k8s-cluster
`;

describe('Configure KubeCtl', () => {
  afterEach(() => {
    mockFs.restore();
  });

  beforeEach(() => {
    setupGcloud.mockResolvedValueOnce('service-project');
    getClusterInfo.mockResolvedValueOnce({
      project: 'gke-project',
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      url: 'projects/gke-project/zones/europe-west1/clusters/k8s-cluster',
    });
  });

  test('It fails if cloud-run.yaml is missing', async () => {
    mockFs({});
    expect(configureKubeCtl('sa', '', '')).rejects
      .toEqual(new Error('Service specification file not found: cloud-run.yaml'));
  });

  test('It fails for missing cluster definition', async () => {
    mockFs({
      'cloud-run.yaml': noClusterYaml,
    });
    expect(configureKubeCtl('sa', '', '')).rejects
      .toEqual(new Error("'cluster' must be defined as input or in cloud-run.yaml"));
  });

  test('It will use cluster from cloud-run.yaml', async () => {
    mockFs({
      'cloud-run.yaml': clusterYaml,
    });
    const clusterInfo = await configureKubeCtl('sa', '', '');

    expect(clusterInfo).toEqual({
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      project: 'gke-project',
      url: 'projects/gke-project/zones/europe-west1/clusters/k8s-cluster',
      namespace: 'my-test',
    });

    expect(getClusterInfo).toHaveBeenCalledWith(
      'service-project',
      'projects/gke-project/zones/europe-west1/clusters/k8s-cluster',
    );
    expect(authenticateKubeCtl).toHaveBeenCalledWith({
      project: 'gke-project',
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      url: 'projects/gke-project/zones/europe-west1/clusters/k8s-cluster',
    });
  });

  test('It will use input cluster and namespace', async () => {
    await configureKubeCtl('sa', 'input-cluster', 'ns');
    expect(getClusterInfo).toHaveBeenCalledWith(
      'service-project',
      'input-cluster',
    );
  });
});
