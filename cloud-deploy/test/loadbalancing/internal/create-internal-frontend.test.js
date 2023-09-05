const core = require('@actions/core');
const gcloudOutput = require('../../../src/utils/gcloud-output');
const configureInternalFrontend = require('../../../src/loadbalancing/internal/create-internal-frontend');
const setupInternalDomainMapping = require('../../../src/loadbalancing/internal/setup-internal-domainmapping');

jest.mock('@actions/core');
jest.mock('../../../src/utils/gcloud-output');
jest.mock('../../../src/loadbalancing/internal/setup-internal-domainmapping');

describe('configureInternalFrontend', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should configure internal frontend with correct parameters', async () => {
    gcloudOutput.mockResolvedValue();

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';
    const protocol = 'http';

    await configureInternalFrontend(projectID, name, env, protocol);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'target-http-proxies',
      'create',
      'http-lb-proxy-internal',
      `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
      '--region=europe-west1',
      `--project=${projectID}`,
    ]);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'forwarding-rules',
      'create',
      'http-proxy-internal',
      '--load-balancing-scheme=INTERNAL_MANAGED',
      '--subnet=k8s-subnet',
      '--network=clan-network',
      '--target-http-proxy=http-lb-proxy-internal',
      '--target-http-proxy-region=europe-west1',
      '--region=europe-west1',
      `--project=${projectID}`,
      '--ports=80',
    ]);

    expect(setupInternalDomainMapping).toHaveBeenCalledWith(projectID, env, name, protocol);
  });

  test('should configure internal frontend for http2 correctly', async () => {

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';
    const protocol = 'http2';

    await configureInternalFrontend(projectID, name, env, protocol);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1,[
      'compute',
      'ssl-certificates',
      'create',
      'extenda-internal-certificate',
      `--certificate=cert.cert`,
      `--private-key=key.key`,
      `--project=${projectID}`,
      '--region=europe-west1',
    ]);
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(2,[
      'compute',
      'target-https-proxies',
      'create',
      'https-lb-proxy-internal',
      '--ssl-certificates=extenda-internal-certificate',
      `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
      '--region=europe-west1',
      `--project=${projectID}`,
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3,[
      'compute',
      'forwarding-rules',
      'create',
      'https-proxy-internal',
      '--load-balancing-scheme=INTERNAL_MANAGED',
      '--subnet=k8s-subnet',
      '--network=clan-network',
      '--target-https-proxy=https-lb-proxy-internal',
      '--target-https-proxy-region=europe-west1',
      '--region=europe-west1',
      `--project=${projectID}`,
      '--ports=443',
    ]);

    expect(setupInternalDomainMapping).toHaveBeenCalledWith(projectID, env, name, protocol);
  });

  test('should handle failures gracefully', async () => {
    gcloudOutput.mockRejectedValueOnce();
    gcloudOutput.mockRejectedValueOnce();
    core.info.mockImplementation(() => {});

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';
    const protocol = 'http';

    await configureInternalFrontend(projectID, name, env, protocol);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'target-http-proxies',
      'create',
      'http-lb-proxy-internal',
      `--url-map=${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
      '--region=europe-west1',
      `--project=${projectID}`,
    ]);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'forwarding-rules',
      'create',
      'http-proxy-internal',
      '--load-balancing-scheme=INTERNAL_MANAGED',
      '--subnet=k8s-subnet',
      '--network=clan-network',
      '--target-http-proxy=http-lb-proxy-internal',
      '--target-http-proxy-region=europe-west1',
      '--region=europe-west1',
      `--project=${projectID}`,
      '--ports=80',
    ]);

    expect(core.info).toHaveBeenCalledWith('proxy already exists');
    expect(core.info).toHaveBeenCalledWith('Forwarding rule already exists!');
  });
});
