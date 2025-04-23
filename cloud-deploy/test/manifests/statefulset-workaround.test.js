const gcloudOutput = require('../../src/utils/gcloud-output');
const handleStatefulset = require('../../src/manifests/statefulset-workaround');

jest.mock('../../src/utils/gcloud-output', () =>
  jest.fn().mockImplementation(() => Promise.resolve()),
);

describe('statefulset-workaround', () => {
  const mockServiceName = 'service-name';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not update PVCs', async () => {
    const statefulset = {
      items: [
        {
          spec: {
            volumeClaimTemplates: [
              {
                spec: {
                  resources: {
                    requests: {
                      storage: '5Gi',
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    };
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(statefulset));

    await handleStatefulset(mockServiceName, '5Gi');

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'get',
        'sts',
        `--namespace=${mockServiceName}`,
        '--output=json',
      ]),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  it('should update pvcs', async () => {
    const statefulset = {
      items: [
        {
          spec: {
            volumeClaimTemplates: [
              {
                spec: {
                  resources: {
                    requests: {
                      storage: '10Gi',
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    };
    const pvcs = {
      items: [
        {
          metadata: {
            name: 'pvc-name-1',
          },
        },
      ],
    };
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(statefulset));
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(pvcs));

    await handleStatefulset(mockServiceName, '5Gi');

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'get',
        'sts',
        `--namespace=${mockServiceName}`,
        '--output=json',
      ]),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        'get',
        'pvc',
        `--namespace=${mockServiceName}`,
        '--output=json',
      ]),
      expect.anything(),
      expect.anything(),
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      4,
      expect.arrayContaining([
        'delete',
        'sts',
        mockServiceName,
        `--namespace=${mockServiceName}`,
        '--cascade=orphan',
      ]),
      expect.anything(),
    );
    expect(gcloudOutput).toHaveBeenCalledTimes(4);
  });
});
