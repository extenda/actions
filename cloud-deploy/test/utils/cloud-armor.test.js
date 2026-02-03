import { beforeEach, describe, expect, it, vi } from 'vitest';

import checkPolicyExists from '../../src/utils/cloud-armor.js';
import gcloudOutput from '../../src/utils/gcloud-output.js';

vi.mock('@actions/core');
vi.mock('../../src/utils/gcloud-output', () =>
  vi.fn().mockImplementation(() => Promise.resolve()),
);

describe('check cloud armor policy', () => {
  const mockProjectID = 'project-staging';
  const mockPolicyName = 'cloud-armor-policy';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should check the cloud armor policy exists', async () => {
    gcloudOutput.mockResolvedValueOnce();

    await checkPolicyExists(mockPolicyName, mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      [
        'compute',
        'security-policies',
        'describe',
        mockPolicyName,
        `--project=${mockProjectID}`,
      ],
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should fail if cloud armor policy does not exist', async () => {
    gcloudOutput.mockRejectedValueOnce();
    await expect(
      checkPolicyExists(mockPolicyName, mockProjectID),
    ).rejects.toThrow(
      `No cloud armor policy with name "${mockPolicyName}" found`,
    );
  });
});
