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
    axios.put.mockResolvedValue(true);

    const config = {
      headers: {
        authorization: 'Bearer idToken',
      },
    };

    await configureBundleSync(iam, 'prod');
    expect(execGcloud).toHaveBeenCalledWith(['auth', 'print-identity-token']);
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/systems/tst.my-test-prod'),
      null,
      config,
    );
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/systems/tst.my-test-prod/datasets/consumers'),
      {
        services: [
          'sa1',
          'sa2',
          'sa1tes1',
          'sa2tes2',
        ],
      },
      config,
    );
  });

  test('It throws on error', async () => {
    execGcloud.mockResolvedValueOnce('idToken');
    axios.put.mockRejectedValueOnce(new Error('TEST'));
    await expect(configureBundleSync(iam, 'staging')).rejects.toEqual(new Error('TEST'));
    expect(axios.put).toHaveBeenCalledTimes(1);
  });
});
