jest.mock('@actions/exec');

const exec = require('@actions/exec');
const { getClusterInfo } = require('../../src/utils/cluster-info');
const { mockOutput } = require('./utils');

describe('getClusterInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can find cluster and zone from tribe', async () => {
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('tribe-staging-12345', opts))
      .mockImplementationOnce((bin, args, opts) => mockOutput('k8s-cluster    europe-west1', opts));

    const cluster = await getClusterInfo('tribe-clan-staging-12345');
    expect(cluster).toEqual({
      project: 'tribe-staging-12345',
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      uri: 'projects/tribe-staging-12345/zones/europe-west1/clusters/k8s-cluster',
    });
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['--quiet', 'projects', 'list', '--filter=NAME~-staging$ AND PROJECT_ID!=tribe-clan-staging-12345', '--format=value(PROJECT_ID)']));
    expect(exec.exec.mock.calls[1][1]).toEqual(expect.arrayContaining(['--quiet', 'container', 'clusters', '--format=value(NAME,LOCATION)']));
  });

  test('It throws for non-clan project', async () => {
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('', opts));
    await expect(getClusterInfo('tribe-clan-prod-12345')).rejects
      .toEqual(new Error('Could not find GKE project with suffix -prod, or missing permissions to list it.'));
  });

  test('It throws for missing cluster', async () => {
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('tribe-staging-12345', opts))
      .mockImplementationOnce((bin, args, opts) => mockOutput('', opts));
    await expect(getClusterInfo('tribe-clan-staging-12345')).rejects
      .toEqual(new Error('Failed to find a GKE cluster in tribe-staging-12345.'));
  });

  test('It can find cluster zone from cluster URI', async () => {
    const cluster = await getClusterInfo(
      'tribe-clan-staging-12345',
      'projects/tribe-staging-12345/zones/europe-west1/clusters/my-cluster',
    );
    expect(cluster).toEqual({
      project: 'tribe-staging-12345',
      cluster: 'my-cluster',
      clusterLocation: 'europe-west1',
      uri: 'projects/tribe-staging-12345/zones/europe-west1/clusters/my-cluster',
    });
    expect(exec.exec).not.toHaveBeenCalled();
  });

  test('It can find cluster zone from this project and cluster', async () => {
    exec.exec.mockImplementationOnce((bin, args, opts) => mockOutput('my-cluster    europe-west1', opts));
    const cluster = await getClusterInfo(
      'tribe-clan-prod-12345',
      'my-cluster',
    );
    expect(cluster).toEqual({
      project: 'tribe-clan-prod-12345',
      cluster: 'my-cluster',
      clusterLocation: 'europe-west1',
      uri: 'projects/tribe-clan-prod-12345/zones/europe-west1/clusters/my-cluster',
    });
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
