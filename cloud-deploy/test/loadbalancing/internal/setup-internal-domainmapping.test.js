const setupInternalDomainMapping = require('../../../src/loadbalancing/internal/setup-internal-domainmapping');
const gcloudOutput = require('../../../src/utils/gcloud-output');

jest.mock('../../../src/utils/gcloud-output');

describe('setupInternalDomainMapping', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should set up internal domain mapping with correct parameters', async () => {
    gcloudOutput.mockImplementationOnce(() => Promise.resolve());
    gcloudOutput.mockResolvedValueOnce('192.168.0.1');
    gcloudOutput.mockImplementationOnce(() => Promise.resolve());

    const projectID = 'my-project';
    const env = 'dev';
    const name = 'my-service';
    const protocol = 'http';

    await setupInternalDomainMapping(projectID, env, name, protocol);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'create',
      `${projectID.split(`-${env}`)[0]}-${env}`,
      `--project=${projectID}`,
      '--description=A private internal managed dns zone',
      '--dns-name=internal',
      '--visibility=private',
      '--networks=clan-network',
      '--quiet',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'compute',
      'forwarding-rules',
      'list',
      `--project=${projectID}`,
      '--filter=name=(\'http-proxy-internal\')',
      '--format=get(IPAddress)',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'dns',
      'record-sets',
      'create',
      `${name}.internal`,
      `--project=${projectID}`,
      `--zone=${projectID.split(`-${env}`)[0]}-${env}`,
      '--type=A',
      '--ttl=300',
      '--rrdatas=192.168.0.1',
      '--quiet',
    ]);
  });

  test('should set up internal domain mapping for http2', async () => {
    gcloudOutput.mockImplementationOnce(() => Promise.resolve());
    gcloudOutput.mockResolvedValueOnce('192.168.0.1');
    gcloudOutput.mockImplementationOnce(() => Promise.resolve());

    const projectID = 'my-project';
    const env = 'dev';
    const name = 'my-service';
    const protocol = 'http2';

    await setupInternalDomainMapping(projectID, env, name, protocol);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'dns',
      'managed-zones',
      'create',
      `${projectID.split(`-${env}`)[0]}-${env}`,
      `--project=${projectID}`,
      '--description=A private internal managed dns zone',
      '--dns-name=internal',
      '--visibility=private',
      '--networks=clan-network',
      '--quiet',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'compute',
      'forwarding-rules',
      'list',
      `--project=${projectID}`,
      '--filter=name=(\'https-proxy-internal\')',
      '--format=get(IPAddress)',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'dns',
      'record-sets',
      'create',
      `${name}.internal`,
      `--project=${projectID}`,
      `--zone=${projectID.split(`-${env}`)[0]}-${env}`,
      '--type=A',
      '--ttl=300',
      '--rrdatas=192.168.0.1',
      '--quiet',
    ]);
  });
});
