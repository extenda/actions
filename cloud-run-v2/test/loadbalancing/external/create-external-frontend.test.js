const gcloudOutput = require("../../../src/utils/gcloud-output");
const configureExternalLBFrontend = require('../../../src/loadbalancing/external/create-external-frontend');

jest.mock('../../../src/loadbalancing/external/handle-certificate');
jest.mock('../../../src/loadbalancing/external/setup-external-domainmapping');
jest.mock('../../../src/utils/gcloud-output');

const managedZones = JSON.stringify([
  'example.com.'
]);

describe('configureExternalLBFrontend', () => {
  const projectID = 'test-project';
  const env = 'test-env';
  const host = 'test-host';

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should configure the load balancer frontend', async () => {
    gcloudOutput.mockResolvedValue();
    gcloudOutput.mockResolvedValue(managedZones);
    gcloudOutput.mockResolvedValue();
    gcloudOutput.mockResolvedValue();
    gcloudOutput.mockResolvedValue('1.2.3.4');

    await configureExternalLBFrontend(projectID, env, host);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, ['compute', 'addresses', 'describe', `${projectID}-lb-external-ip`, `--project=${projectID}`, '--global', '--format=get(address)']);
    expect(gcloudOutput).toHaveBeenNthCalledWith(2, ['compute', 'ssl-policies', 'create', 'extenda-ssl-policy', '--profile=MODERN', '--min-tls-version=1.2', `--project=${projectID}`, '--global']);
    expect(gcloudOutput).toHaveBeenNthCalledWith(3, ['compute', 'target-https-proxies', 'create', 'https-lb-proxy-external', `--url-map=${projectID}-${env}-lb-external`, expect.any(String), `--ssl-policy=extenda-ssl-policy`, `--project=${projectID}`]);
    expect(gcloudOutput).toHaveBeenNthCalledWith(4, ['compute', 'forwarding-rules', 'create', 'https-proxy-external', `--address=1.2.3.4`, `--target-https-proxy=https-lb-proxy-external`, '--global', `--project=${projectID}`, '--ports=443']);
  });

  it('should update an existing https proxy if it already exists', async () => {
    gcloudOutput.mockRejectedValueOnce();
    gcloudOutput.mockResolvedValue();
    gcloudOutput.mockResolvedValue('1.2.3.4');
    gcloudOutput.mockResolvedValueOnce('https-lb-proxy-external');
    gcloudOutput.mockResolvedValue();
    gcloudOutput.mockResolvedValue();

    await configureExternalLBFrontend(projectID, env, host);

    expect(gcloudOutput).toHaveBeenNthCalledWith(5, ['compute', 'target-https-proxies', 'create', 'https-lb-proxy-external', `--url-map=${projectID}-${env}-lb-external`, expect.any(String), `--ssl-policy=extenda-ssl-policy`, `--project=${projectID}`]);
    expect(gcloudOutput).toHaveBeenNthCalledWith(6, ['compute', 'forwarding-rules', 'create', 'https-proxy-external', expect.any(String), `--target-https-proxy=https-lb-proxy-external`, '--global', `--project=${projectID}`, '--ports=443']);
  });

  it('should handle errors', async () => {
    gcloudOutput.mockRejectedValue(new Error('Something went wrong'));

    await expect(configureExternalLBFrontend(projectID, env, host)).rejects.toThrow('Something went wrong');
  });
});
