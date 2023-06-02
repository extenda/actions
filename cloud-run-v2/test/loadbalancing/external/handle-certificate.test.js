const handleCertificates = require('../../../src/loadbalancing/external/handle-certificate');
const gcloudOutput = require('../../../src/utils/gcloud-output');
jest.mock('../../../src/utils/gcloud-output');

describe('handleCertificates', () => {
  const project = 'test-staging-1223';
  const existingCerts = JSON.stringify([{
    name: 'extenda-certs-v1', managed: {
      domains: ['example.com', 'www.example1.com']
    },
    creationTimestamp: '2022-05-01T00:00:00.000Z'
  },
  {
    name: 'extenda-certs-v2',
    managed: {
      domains: ['example.org', 'www.example.org']
    },
    creationTimestamp: '2022-05-02T00:00:00.000Z'
  },
  ]);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return a list of certificates string if all domains already exist in a certificate', async () => {
    const hosts = ['example.com', 'www.example1.com'];
    gcloudOutput.mockResolvedValueOnce(existingCerts);

    const result = await handleCertificates(hosts, project);
    expect(result).toEqual('extenda-certs-v1,extenda-certs-v2');
    expect(gcloudOutput).toHaveBeenCalledTimes(1);

  });

  it('should create a new certificate with domains that do not exist in existing certificates', async () => {
    const hosts = ['example.com', 'www.example.com', 'example.org'];
    gcloudOutput.mockResolvedValueOnce(existingCerts);
    gcloudOutput.mockImplementation(() => Promise.resolve());

    const result = await handleCertificates(hosts, project);
    expect(result).toContain('extenda-certs-v3');
    expect(gcloudOutput).toHaveBeenCalledTimes(2);
  });
});
