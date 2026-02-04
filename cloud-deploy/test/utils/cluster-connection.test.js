import { beforeEach, describe, expect, it, vi } from 'vitest';

import connectToCluster from '../../src/utils/cluster-connection.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';

vi.mock('../../src/utils/gcloud-output', () => ({
  default: vi.fn().mockImplementation(() => Promise.resolve()),
}));

describe('cluster connection', () => {
  const mockProjectID = 'project-staging';
  const mockEnv = 'staging';

  beforeEach(() => {
    vi.clearAllMocks();
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
