import mockFs from 'mock-fs';

import { getClusterInfo } from '../../cloud-run/src/cluster-info.js';
import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';

jest.mock('../../setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');
jest.mock('../../cloud-run/src/kubectl-auth');

import configureKubeCtl from '../src/configure-kubectl.js';

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
    await expect(configureKubeCtl('sa', '', '')).rejects.toEqual(
      new Error('Service specification file not found: cloud-run.yaml'),
    );
  });

  test('It will find cluster if definition is missing', async () => {
    mockFs({
      'cloud-run.yaml': noClusterYaml,
    });
    const clusterInfo = await configureKubeCtl('sa', '', '');
    expect(clusterInfo).toEqual({
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      project: 'gke-project',
      url: 'projects/gke-project/zones/europe-west1/clusters/k8s-cluster',
      namespace: 'my-test',
      name: 'my-test',
    });
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
      name: 'my-test',
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
    const clusterInfo = await configureKubeCtl('sa', 'input-cluster', 'ns');
    expect(clusterInfo).toMatchObject({
      namespace: 'ns',
      name: '',
    });
    expect(getClusterInfo).toHaveBeenCalledWith(
      'service-project',
      'input-cluster',
    );
  });
});
