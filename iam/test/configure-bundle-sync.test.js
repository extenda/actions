const axios = require('axios');
const configureBundleSync = require('../src/configure-bundle-sync');
const { execGcloud } = require('../../setup-gcloud');

jest.mock('../../setup-gcloud');
jest.mock('axios');

describe('Configure bundle sync', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const iam = {
    'permission-prefix': 'tst',
    name: 'my-test',
    services: [
      {
        name: 'service1',
        'allowed-consumers': [
          { clan: 'test', 'service-accounts': ['sa1', 'sa2'] },
          { clan: 'test1', 'service-accounts': ['sa1tes1', 'sa2tes2'] },
        ],
      },
      {
        name: 'service2',
      },
    ],
  };

  test('It configures systems and consumers', async () => {
    execGcloud.mockResolvedValueOnce('idToken');
    const mockPut = jest.fn().mockResolvedValueOnce({});
    axios.create.mockReturnValue({ put: mockPut });

    await configureBundleSync(iam, 'prod');
    expect(axios.create).toHaveBeenCalledWith({
      baseUrl: 'https://iam-das-worker.retailsvc.com/api/v1',
      headers: { authorization: 'Bearer idToken' },
    });

    expect(execGcloud).toHaveBeenCalledWith([
      'auth',
      'print-identity-token',
      '--audiences=iam-das-worker',
    ]);
    expect(mockPut).toHaveBeenCalledWith('/systems/tst.service1-prod');
    expect(mockPut).toHaveBeenCalledWith('/systems/tst.service2-prod');
    expect(mockPut).toHaveBeenCalledWith(
      '/systems/tst.service1-prod/datasets/consumers',
      {
        services: ['sa1', 'sa2', 'sa1tes1', 'sa2tes2'],
      },
    );
  });

  test('It throws on error', async () => {
    execGcloud.mockResolvedValueOnce('idToken');
    const mockPut = jest.fn().mockRejectedValueOnce(new Error('TEST'));
    axios.create.mockReturnValue({ put: mockPut });

    await expect(configureBundleSync(iam, 'staging')).rejects.toEqual(
      new Error('TEST'),
    );
    expect(mockPut).toHaveBeenCalledTimes(1);
  });
});
