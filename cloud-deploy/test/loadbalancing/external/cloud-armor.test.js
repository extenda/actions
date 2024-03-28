const { setCloudArmorPolicyTarget, checkPolicyExists, checkPolicyTarget } = require('../../../src/loadbalancing/external/cloud-armor');
const gcloudOutput = require('../../../src/utils/gcloud-output');

jest.mock('@actions/core');
jest.mock('../../../src/utils/gcloud-output', () => jest.fn().mockImplementation(() => Promise.resolve()));

describe('Add cloud armor target', () => {
  const mockProjectID = 'project-staging';
  const mockServiceName = 'service-name';
  const mockPolicyName = 'cloud-armor-policy';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should setup the cloud armor policy target', async () => {
    gcloudOutput.mockResolvedValueOnce();

    await setCloudArmorPolicyTarget(mockServiceName, mockPolicyName, mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'compute',
      'backend-services',
      'update',
      `${mockServiceName}-external-backend`,
      '--global',
      `--security-policy=${mockPolicyName}`,
      `--project=${mockProjectID}`,
    ]);
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should check the cloud armor policy exists', async () => {
    gcloudOutput.mockResolvedValueOnce();

    await checkPolicyExists(mockPolicyName, mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'compute',
      'security-policies',
      'describe',
      mockPolicyName,
      `--project=${mockProjectID}`,
    ], 'gcloud', expect.anything(), expect.anything());
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('Should fail if cloud armor policy does not exist', async () => {
    gcloudOutput.mockRejectedValueOnce();
    await expect(checkPolicyExists(mockPolicyName, mockProjectID)).rejects.toThrow(`No cloud armor policy with name "${mockPolicyName}" found`);
  });

  it('Should check the backend security policy is already added', async () => {
    const mockDescribeObject = JSON.stringify({
      securityPolicy: `https://www.googleapis.com/compute/v1/projects/${mockProjectID}/global/securityPolicies/${mockPolicyName}`,
    });
    gcloudOutput.mockResolvedValueOnce(mockDescribeObject);

    const result = await checkPolicyTarget(mockServiceName, mockPolicyName, mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'compute',
      'backend-services',
      'describe',
      `${mockServiceName}-external-backend`,
      '--global',
      `--project=${mockProjectID}`,
      '--format=json',
    ]);
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
    expect(result).toEqual(true);
  });

  it('Should check the backend security policy does not match', async () => {
    const mockDescribeObject = JSON.stringify({
      securityPolicy: `https://www.googleapis.com/compute/v1/projects/${mockProjectID}/global/securityPolicies/${mockPolicyName}`,
    });
    gcloudOutput.mockResolvedValueOnce(mockDescribeObject);

    const result = await checkPolicyTarget(mockServiceName, 'some-policy-name', mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'compute',
      'backend-services',
      'describe',
      `${mockServiceName}-external-backend`,
      '--global',
      `--project=${mockProjectID}`,
      '--format=json',
    ]);
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
    expect(result).toEqual(false);
  });

  it('Should check there is no backend security policy', async () => {
    const mockDescribeObject = JSON.stringify({
      name: 'backend-name',
    });
    gcloudOutput.mockResolvedValueOnce(mockDescribeObject);

    const result = await checkPolicyTarget(mockServiceName, 'some-policy-name', mockProjectID);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'compute',
      'backend-services',
      'describe',
      `${mockServiceName}-external-backend`,
      '--global',
      `--project=${mockProjectID}`,
      '--format=json',
    ]);
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
    expect(result).toEqual(false);
  });
});
