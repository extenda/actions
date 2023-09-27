const gcloudOutput = require('../../../src/utils/gcloud-output');
const setupExternalDomainMapping = require('../../../src/loadbalancing/external/setup-external-domainmapping');

jest.mock('../../../src/utils/gcloud-output');

describe('setupExternalDomainMapping', () => {
  let hosts;
  let migrate;
  let loadBalancerIP;

  beforeEach(() => {
    hosts = ['host1.example.com', 'host2.example.com'];
    migrate = 'true';
    loadBalancerIP = '1.2.3.4';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create record set if it does not exist', async () => {
    const DNSZones = [{
      dnsName: 'example.com.',
      name: 'example-com',
    }];

    gcloudOutput.mockResolvedValueOnce(JSON.stringify(DNSZones));
    gcloudOutput.mockImplementation(() => Promise.resolve(false));

    await setupExternalDomainMapping(hosts, migrate, loadBalancerIP);

    expect(gcloudOutput).toHaveBeenCalledTimes(5);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'list',
      '--project=extenda',
      '--format=json',
    ]);
    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'dns',
      'record-sets',
      'create',
      'host1.example.com',
      '--type=A',
      '--rrdatas=1.2.3.4',
      '--zone=example-com',
      '--project=extenda',
      '--ttl=300',
    ]);
  });

  it('should update record set if it exists and migrate is true', async () => {
    const DNSZones = [{
      dnsName: 'example.com.',
      name: 'example-com',
    }];

    gcloudOutput.mockResolvedValueOnce(JSON.stringify(DNSZones));
    gcloudOutput.mockResolvedValueOnce('1.2.3.4');
    await setupExternalDomainMapping(hosts, migrate, '4.3.2.1');

    expect(gcloudOutput).toHaveBeenCalledTimes(5);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'list',
      '--project=extenda',
      '--format=json',
    ]);
    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'dns',
      'record-sets',
      'update',
      'host1.example.com',
      '--type=A',
      '--rrdatas=4.3.2.1',
      '--zone=example-com',
      '--project=extenda',
      '--ttl=300',
    ]);
  });

  it('should remove host from hosts array if record set exists and migrate is false', async () => {
    const DNSZones = [{
      dnsName: 'example.com.',
      name: 'example-com',
    }];

    gcloudOutput.mockResolvedValueOnce(JSON.stringify(DNSZones));
    gcloudOutput.mockResolvedValueOnce('1.2.3.4');
    await setupExternalDomainMapping(hosts, false, '4.3.2.1');

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'list',
      '--project=extenda',
      '--format=json',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'dns',
      'record-sets',
      'describe',
      'host1.example.com',
      '--type=A',
      '--zone=example-com',
      '--project=extenda',
      '--format=get(rrdatas)',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'dns',
      'record-sets',
      'describe',
      'host2.example.com',
      '--type=A',
      '--zone=example-com',
      '--project=extenda',
      '--format=get(rrdatas)',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(4, [
      'dns',
      'record-sets',
      'create',
      'host2.example.com',
      '--type=A',
      '--rrdatas=4.3.2.1',
      '--zone=example-com',
      '--project=extenda',
      '--ttl=300',
    ]);

    // Check that the hosts array was modified correctly
    expect(hosts).toEqual(['host2.example.com']);
  });

  it('should not migrate when migrate is false and IP matches', async () => {
    hosts = ['example.com'];
    migrate = 'false';
    loadBalancerIP = '1.2.3.4';

    const projectID = 'extenda';
    const DNSZones = [
      { name: 'example-com', dnsName: 'example.com.' },
    ];
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(DNSZones));
    gcloudOutput.mockResolvedValueOnce('1.2.3.4');

    await setupExternalDomainMapping(hosts, migrate, loadBalancerIP);

    expect(gcloudOutput).toHaveBeenCalledTimes(2);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'list',
      `--project=${projectID}`,
      '--format=json',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'dns',
      'record-sets',
      'describe',
      'example.com',
      '--type=A',
      '--zone=example-com',
      `--project=${projectID}`,
      '--format=get(rrdatas)',
    ]);

    // Check that the hosts array was modified correctly
    expect(hosts).toEqual(['example.com']);
  });
});
