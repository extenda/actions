import connectToCluster from '../../src/utils/cluster-connection.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';

jest.mock('../../src/utils/gcloud-output', () =>
  jest.fn().mockImplementation(() => Promise.resolve()),
);

describe('cluster connection', () => {
  const mockProjectID = 'project-staging';
  const mockEnv = 'staging';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to the cluster', async () => {
    gcloudOutput.mockResolvedValueOnce();

    await connectToCluster('clanName', mockEnv, mockProjectID);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'container',
        'clusters',
        'get-credentials',
        'clanName-cluster-staging',
        '--region=europe-west1',
        `--project=${mockProjectID}`,
      ]),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });
});
