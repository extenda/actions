const setupInternalDomainMapping = require('../../../src/loadbalancing/internal/setup-internal-domainmapping');
const gcloudOutput = require('../../../src/utils/gcloud-output');
const core = require('@actions/core');


jest.mock('../../../src/utils/gcloud-output');
jest.mock('@actions/core');

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
    
    await setupInternalDomainMapping(projectID, env, name);
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(1,[
      'dns',
      'managed-zones',
      'create',
      `${projectID.split('-' + env)[0]}-${env}`,
      `--project=${projectID}`,
      '--description=A private internal managed dns zone',
      '--dns-name=internal.retailsvc.com',
      '--visibility=private',
      '--networks=clan-network',
      '--quiet',
    ]);
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(2,[
      'compute',
      'forwarding-rules',
      'list',
      `--project=${projectID}`,
      `--filter=name=('http-proxy-internal')`,
      `--format=get(IPAddress)`,
    ]);
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(3,[
      'dns',
      'record-sets',
      'create',
      `${name}.internal.retailsvc.com`,
      `--project=${projectID}`,
      `--zone=${projectID.split('-' + env)[0]}-${env}`,
      '--type=A',
      '--ttl=300',
      '--rrdatas=192.168.0.1',
      '--quiet',
    ]);
  });
  
  test('should handle failures gracefully', async () => {
    gcloudOutput.mockImplementation(() => Promise.resolve());
    gcloudOutput.mockRejectedValueOnce();
    core.info.mockImplementation(() => {});
    
    const projectID = 'my-project';
    const env = 'dev';
    const name = 'my-service';

    await setupInternalDomainMapping(projectID, env, name);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1,[
      'dns',
      'managed-zones',
      'create',
      `${projectID.split('-' + env)[0]}-${env}`,
      `--project=${projectID}`,
      '--description=A private internal managed dns zone',
      '--dns-name=internal.retailsvc.com',
      '--visibility=private',
      '--networks=clan-network',
      '--quiet',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2,[
      'compute',
      'forwarding-rules',
      'list',
      `--project=${projectID}`,
      `--filter=name=('http-proxy-internal')`,
      `--format=get(IPAddress)`,
    ]);
    expect(core.info).toHaveBeenCalledWith('managed dns zone already exists');
  });
});