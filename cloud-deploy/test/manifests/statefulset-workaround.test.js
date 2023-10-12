const gcloudOutput = require('../../src/utils/gcloud-output');
const handleStatefulset = require('../../src/manifests/statefulset-workaround');

jest.mock('../../src/utils/gcloud-output', () => jest.fn().mockImplementation(() => Promise.resolve()));

describe('statefulset-workaround', () => {
  const mockProjectID = 'project-staging';
  const mockServiceName = 'service-name';
  const mockEnv = 'staging';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not update PVCs', async () => {
    const statefulset = {
      items: [{
        spec: {
          volumeClaimTemplates: [{
            spec: {
              resources: {
                requests: {
                  storage: '5Gi',
                },
              },
            },
          }],
        },
      }],
    };
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(statefulset));

    await handleStatefulset(mockProjectID, mockServiceName, 'clanName', mockEnv, '5Gi');

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      'container',
      'clusters',
      'get-credentials',
      'clanName-cluster-staging',
      '--region=europe-west1',
      `--project=${mockProjectID}`,
    ]));
    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      'get',
      'sts',
      `--namespace=${mockServiceName}`,
      '--output=json',
    ]), expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenCalledTimes(2);
  });

  it('should update pvcs', async () => {
    const statefulset = {
      items: [{
        spec: {
          volumeClaimTemplates: [{
            spec: {
              resources: {
                requests: {
                  storage: '10Gi',
                },
              },
            },
          }],
        },
      }],
    };
    const pvcs = {
      items: [{
        metadata: {
          name: 'pvc-name-1',
        },
      }],
    };
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(statefulset));
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(pvcs));

    await handleStatefulset(mockProjectID, mockServiceName, 'clanName', mockEnv, '5Gi');

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      'container',
      'clusters',
      'get-credentials',
      'clanName-cluster-staging',
      '--region=europe-west1',
      `--project=${mockProjectID}`,
    ]));
    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      'get',
      'sts',
      `--namespace=${mockServiceName}`,
      '--output=json',
    ]), expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'get',
      'pvc',
      `--namespace=${mockServiceName}`,
      '--output=json',
    ]), expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(5, expect.arrayContaining([
      'delete',
      'sts',
      mockServiceName,
      `--namespace=${mockServiceName}`,
      '--cascade=orphan',
    ]), expect.anything());
    expect(gcloudOutput).toHaveBeenCalledTimes(5);
  });
});
