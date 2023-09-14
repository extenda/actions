jest.mock('@actions/exec');
jest.mock('../../src/utils/gcloud-output');

const { getClusterInfo } = require('../../src/utils/cluster-info');
const execGcloud = require('../../src/utils/gcloud-output');

describe('getClusterInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can find cluster and zone from tribe', async () => {
    execGcloud.mockResolvedValueOnce('tribe-staging-12345')
      .mockResolvedValueOnce('k8s-cluster    europe-west1');

    const cluster = await getClusterInfo('tribe-clan-staging-12345');
    expect(cluster).toEqual({
      project: 'tribe-staging-12345',
      cluster: 'k8s-cluster',
      clusterLocation: 'europe-west1',
      uri: 'projects/tribe-staging-12345/zones/europe-west1/clusters/k8s-cluster',
    });
    expect(execGcloud).toHaveBeenCalledTimes(2);
    expect(execGcloud.mock.calls[0][0]).toEqual(expect.arrayContaining(['--quiet', 'projects', 'list', '--filter=NAME~-staging$ AND PROJECT_ID!=tribe-clan-staging-12345', '--format=value(PROJECT_ID)']));
    expect(execGcloud.mock.calls[1][0]).toEqual(expect.arrayContaining(['--quiet', 'container', 'clusters', '--format=value(NAME,LOCATION)']));
  });

  test('It throws for non-clan project', async () => {
    execGcloud.mockResolvedValueOnce('');
    await expect(getClusterInfo('tribe-clan-prod-12345')).rejects
      .toEqual(new Error('Could not find GKE project with suffix -prod, or missing permissions to list it.'));
  });

  test('It throws for missing cluster', async () => {
    execGcloud.mockResolvedValueOnce('tribe-staging-12345').mockResolvedValueOnce('');
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
    expect(execGcloud).not.toHaveBeenCalled();
  });

  test('It can find cluster zone from this project and cluster', async () => {
    execGcloud.mockResolvedValueOnce('my-cluster    europe-west1');
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
    expect(execGcloud).toHaveBeenCalledTimes(1);
  });
});
