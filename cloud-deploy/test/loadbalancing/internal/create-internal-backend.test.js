const gcloudOutput = require('../../../src/utils/gcloud-output');
const createInternalLoadbalancer = require('../../../src/loadbalancing/internal/create-internal-loadbalancer');
const configureInternalDomain = require('../../../src/loadbalancing/internal/create-internal-backend');

jest.mock('../../../src/utils/gcloud-output');
jest.mock('../../../src/loadbalancing/internal/create-internal-loadbalancer');

describe('configureInternalDomain', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should setup internal domain with correct parameters', async () => {
    gcloudOutput.mockImplementation(() => Promise.resolve());
    createInternalLoadbalancer.mockImplementation(() => Promise.resolve());

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';

    await configureInternalDomain(projectID, name, env);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      [
        'compute',
        'health-checks',
        'create',
        'tcp',
        `${projectID}-internal-hc`,
        '--region=europe-west1',
        '--use-serving-port',
        '--check-interval=10s',
        `--project=${projectID}`,
      ]
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      2,
      [
        'compute',
        'backend-services',
        'create',
        `${name}-internal-backend`,
        '--protocol=HTTP',
        '--port-name=http',
        '--connection-draining-timeout=300s',
        `--health-checks=${projectID}-internal-hc`,
        '--timeout=300s',
        '--region=europe-west1',
        '--health-checks-region=europe-west1',
        '--load-balancing-scheme=INTERNAL_MANAGED',
        `--project=${projectID}`,
      ]
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      3,
      [
        "compute",
        "network-endpoint-groups",
        "describe",
        `${name}-neg`,
        `--project=${projectID}`,
        "--zone=europe-west1-d",
      ]
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      6,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-d',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=rate',
        '--max-rate-per-endpoint=1',
      ]
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      7,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-c',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=rate',
        '--max-rate-per-endpoint=1',
      ]
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      8,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-b',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=rate',
        '--max-rate-per-endpoint=1',
      ]
    );

    expect(createInternalLoadbalancer).toHaveBeenCalledWith(projectID, env, name);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      9,
      [
        'compute',
        'url-maps',
        'add-path-matcher',
        `${projectID.split('-' + env)[0]}-${env}-lb-internal`,
        `--project=${projectID}`,
        `--default-service=${name}-internal-backend`,
        `--path-matcher-name=${name}-internal-backend`,
        '--region=europe-west1',
        `--new-hosts=${name}.internal.retailsvc.com`,
      ]
    );
  });
});
