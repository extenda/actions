const configureExternalDomain = require('../../../src/loadbalancing/external/create-external-backend');
const gcloudOutput = require('../../../src/utils/gcloud-output');
jest.mock('@actions/core');
jest.mock('../../../src/utils/gcloud-output', () => {
  return jest.fn().mockImplementation(() => Promise.resolve());
});

describe('configureExternalDomain', () => {
  const mockProjectID = 'project-staging';
  const mockServiceName = 'service-name';
  const mockEnv = 'staging';
  const mockHost = 'example.com';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should setup domain and backend correctly', async () => {
    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      'compute',
      'backend-services',
      'create',
      expect.any(String),
      '--protocol=HTTP',
      '--port-name=http',
      '--connection-draining-timeout=300s',
      expect.any(String),
      '--timeout=300s',
      '--global',
      '--enable-logging',
      '--logging-sample-rate=1',
      '--load-balancing-scheme=EXTERNAL',
      `--project=${mockProjectID}`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      `--zone=europe-west1-d`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      `--zone=europe-west1-c`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(4, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      `--zone=europe-west1-b`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(5, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      `--network-endpoint-group-zone=europe-west1-d`,
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=rate',
      '--max-rate-per-endpoint=1',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(6, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      `--network-endpoint-group-zone=europe-west1-c`,
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=rate',
      '--max-rate-per-endpoint=1',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(7, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      `--network-endpoint-group-zone=europe-west1-b`,
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=rate',
      '--max-rate-per-endpoint=1',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(8, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-path-matcher',
      `project-staging-lb-external`,
      `--project=${mockProjectID}`,
      `--default-service=${mockServiceName}-external-backend`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      '--global',
      `--new-hosts=${mockHost}`,
    ]));
    expect(gcloudOutput).toHaveBeenCalledTimes(8);

  });
});