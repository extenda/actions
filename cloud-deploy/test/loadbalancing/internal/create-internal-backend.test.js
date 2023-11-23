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
    const protocol = 'http';
    const connectionTimeout = 300;

    await configureInternalDomain(projectID, name, env, protocol, connectionTimeout, true);

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
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      3,
      [
        'compute',
        'backend-services',
        'create',
        `${name}-internal-backend`,
        '--port-name=http',
        '--connection-draining-timeout=300s',
        '--region=europe-west1',
        '--health-checks-region=europe-west1',
        '--load-balancing-scheme=INTERNAL_MANAGED',
        `--project=${projectID}`,
        '--protocol=HTTP',
        `--health-checks=${projectID}-internal-hc`,
        '--timeout=300s',
      ], 'gcloud', true, true,
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      4,
      [
        'compute',
        'network-endpoint-groups',
        'describe',
        `${name}-neg`,
        `--project=${projectID}`,
        '--zone=europe-west1-d',
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      7,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-d',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=RATE',
        '--max-rate-per-endpoint=1',
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      8,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-c',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=RATE',
        '--max-rate-per-endpoint=1',
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      9,
      [
        'compute',
        'backend-services',
        'add-backend',
        `${name}-internal-backend`,
        `--network-endpoint-group=${name}-neg`,
        '--network-endpoint-group-zone=europe-west1-b',
        `--project=${projectID}`,
        '--region=europe-west1',
        '--balancing-mode=RATE',
        '--max-rate-per-endpoint=1',
      ],
    );

    expect(createInternalLoadbalancer).toHaveBeenCalledWith(projectID, env, name);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      10,
      [
        'compute',
        'url-maps',
        'add-path-matcher',
        `${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
        `--project=${projectID}`,
        `--default-service=${name}-internal-backend`,
        `--path-matcher-name=${name}-internal-backend`,
        '--region=europe-west1',
        `--new-hosts=${name}.internal`,
      ],
    );
  });

  test('should setup internal domain with correct parameters if cloudrun', async () => {
    gcloudOutput.mockImplementation(() => Promise.resolve());
    createInternalLoadbalancer.mockImplementation(() => Promise.resolve());

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';
    const protocol = 'http';
    const connectionTimeout = 300;

    await configureInternalDomain(projectID, name, env, protocol, connectionTimeout, false);

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
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      3,
      [
        'compute',
        'backend-services',
        'create',
        `${name}-internal-backend`,
        '--port-name=http',
        '--connection-draining-timeout=300s',
        '--region=europe-west1',
        '--health-checks-region=europe-west1',
        '--load-balancing-scheme=INTERNAL_MANAGED',
        `--project=${projectID}`,
        '--protocol=HTTPS',
      ], 'gcloud', true, true
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      4,
      [
        'compute',
        'network-endpoint-groups',
        'create',
        `${name}-cloudrun`,
        '--cloud-run-service=my-service',
        '--network-endpoint-type=serverless',
        `--project=${projectID}`,
        '--region=europe-west1',
      ],
    );

    expect(createInternalLoadbalancer).toHaveBeenCalledWith(projectID, env, name);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      6,
      [
        'compute',
        'url-maps',
        'add-path-matcher',
        `${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
        `--project=${projectID}`,
        `--default-service=${name}-internal-backend`,
        `--path-matcher-name=${name}-internal-backend`,
        '--region=europe-west1',
        `--new-hosts=${name}.internal`,
      ],
    );
  });

  test('should setup internal domain with correct parameters if cloudrun', async () => {
    const status = {
      backends: [
        {
          group: 'zone/service/my-service-neg',
        },
      ],
    };

    // gcloudOutput.mockImplementation(() => Promise.resolve());
    createInternalLoadbalancer.mockImplementation(() => Promise.resolve());
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(JSON.stringify(status));
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockRejectedValueOnce();

    const projectID = 'my-project';
    const name = 'my-service';
    const env = 'dev';
    const protocol = 'http';
    const connectionTimeout = 300;

    await configureInternalDomain(projectID, name, env, protocol, connectionTimeout, false);

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
      ],
    );
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      2,
      [
        'compute',
        'backend-services',
        'describe',
        `${name}-internal-backend`,
        '--region=europe-west1',
        `--project=${projectID}`,
        '--format=json',
      ],
    );
    expect(gcloudOutput).toHaveBeenNthCalledWith(
      3,
      [
        'compute',
        'url-maps',
        'remove-path-matcher',
        'my-project-dev-lb-internal',
        `--path-matcher-name=${name}-internal-backend`,
        '--region=europe-west1',
        `--project=${projectID}`,
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      4,
      [
        'compute',
        'backend-services',
        'delete',
        `${name}-internal-backend`,
        '--region=europe-west1',
        '--quiet',
        `--project=${projectID}`,
      ],
    );

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      6,
      [
        'compute',
        'backend-services',
        'update',
        `${name}-internal-backend`,
        '--no-health-checks',
        '--region=europe-west1',
        `--project=${projectID}`,
        '--protocol=HTTPS',
      ],
    );
  });
});
