const configureExternalDomain = require('../../../src/loadbalancing/external/create-external-backend');
const gcloudOutput = require('../../../src/utils/gcloud-output');

jest.mock('@actions/core');
jest.mock('../../../src/loadbalancing/external/fix-path-matchers');
jest.mock('../../../src/utils/error-handler');
jest.mock('../../../src/utils/gcloud-output', () => jest.fn().mockImplementation(() => Promise.resolve()));

const describeUrlMap = JSON.stringify({
  creationTimestamp: '2020-00-00T00:00:00.000-07:00',
  defaultService: 'https://www.googleapis.com/compute/v1/projects/project-staging/global/backendBuckets/def',
  fingerprint: 'jfockNs=',
  hostRules: [
    {
      hosts: [
        'example.org',
        'test.retailsvc.com',
      ],
      pathMatcher: 'service-name-external-backend',
    },
  ],
  pathMatchers: [
    {
      defaultService: 'https://www.googleapis.com/compute/v1/projects/project-staging/global/backendServices/service-name-external-backend',
      name: 'service-name-external-backend',
    },
  ],
});
const describeUrlMapNoPathMatcher = JSON.stringify({
  creationTimestamp: '2020-00-00T00:00:00.000-07:00',
  defaultService: 'https://www.googleapis.com/compute/v1/projects/project-staging/global/backendBuckets/def',
  fingerprint: 'jfockNs=',
});

describe('configureExternalDomain', () => {
  const mockProjectID = 'project-staging';
  const mockServiceName = 'service-name';
  const mockEnv = 'staging';
  const mockHost = ['example.com'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should setup domain and backend correctly', async () => {
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(describeUrlMap);
    gcloudOutput.mockResolvedValueOnce();

    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost, 'http', 300, true);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
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
    ]), 'gcloud', expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      '--zone=europe-west1-d',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(4, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      '--zone=europe-west1-c',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(5, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'describe',
      expect.any(String),
      `--project=${mockProjectID}`,
      '--zone=europe-west1-b',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(6, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      '--network-endpoint-group-zone=europe-west1-d',
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=RATE',
      '--max-rate-per-endpoint=1',
    ]), 'gcloud', expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(7, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      '--network-endpoint-group-zone=europe-west1-c',
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=RATE',
      '--max-rate-per-endpoint=1',
    ]), 'gcloud', expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(8, expect.arrayContaining([
      'compute',
      'backend-services',
      'add-backend',
      `${mockServiceName}-external-backend`,
      `--network-endpoint-group=${mockServiceName}-neg`,
      '--network-endpoint-group-zone=europe-west1-b',
      `--project=${mockProjectID}`,
      '--global',
      '--balancing-mode=RATE',
      '--max-rate-per-endpoint=1',
    ]), 'gcloud', expect.anything(), expect.anything());

    expect(gcloudOutput).toHaveBeenNthCalledWith(9, expect.arrayContaining([
      'compute',
      'url-maps',
      'describe',
      'project-staging-lb-external',
      `--project=${mockProjectID}`,
      '--format=json',
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(10, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-host-rule',
      'project-staging-lb-external',
      '--hosts=example.com',
      '--path-matcher-name=service-name-external-backend',
      `--project=${mockProjectID}`,
    ]));

    expect(gcloudOutput).toHaveBeenCalledTimes(10);
  });
  it('should setup pathMatcher if no pathmatcher exists', async () => {
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(describeUrlMapNoPathMatcher);
    gcloudOutput.mockResolvedValueOnce();

    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost);

    expect(gcloudOutput).toHaveBeenNthCalledWith(6, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-path-matcher',
      'project-staging-lb-external',
      `--project=${mockProjectID}`,
      `--default-service=${mockServiceName}-external-backend`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      '--global',
      `--new-hosts=${mockHost}`,
    ]));
    expect(gcloudOutput).toHaveBeenCalledTimes(6);
  });

  it('it should update if backend exists', async () => {
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockRejectedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(describeUrlMapNoPathMatcher);
    gcloudOutput.mockResolvedValueOnce();

    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost, 'http', 300, false);

    expect(gcloudOutput).toHaveBeenNthCalledWith(7, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-path-matcher',
      'project-staging-lb-external',
      `--project=${mockProjectID}`,
      `--default-service=${mockServiceName}-external-backend`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      '--global',
      `--new-hosts=${mockHost}`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'compute',
      'backend-services',
      'update',
      `${mockServiceName}-external-backend`,
      '--protocol=HTTPS',
      '--global',
      `--project=${mockProjectID}`,
    ]));

    expect(gcloudOutput).toHaveBeenCalledTimes(7);
  });

  it('it should do switch to cloudrun from gke', async () => {

    const status = {
      backends: [{
        group: 'service-name-neg'
      }],
      logConfig: {
        sampleRate: 1.0
      },
      protocol: 'http',
      timeoutSec: '300s',
    };

    gcloudOutput.mockResolvedValueOnce(JSON.stringify(status));
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(describeUrlMapNoPathMatcher);
    gcloudOutput.mockResolvedValueOnce();

    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost, 'http', 300, false);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      'compute',
      'url-maps',
      'remove-path-matcher',
      `${mockProjectID}-lb-external`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      `--project=${mockProjectID}`,
    ]));
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'compute',
      'backend-services',
      'delete',
      `${mockServiceName}-external-backend`,
      '--global',
      '--quiet',
      `--project=${mockProjectID}`,
    ]));

    expect(gcloudOutput).toHaveBeenNthCalledWith(5, expect.arrayContaining([
      'compute',
      'network-endpoint-groups',
      'create',
      `${mockServiceName}-cloudrun`,
      `--cloud-run-service=${mockServiceName}`,
      '--network-endpoint-type=serverless',
      `--project=${mockProjectID}`,
      `--region=europe-west1`,
    ]));
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(8, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-path-matcher',
      'project-staging-lb-external',
      `--project=${mockProjectID}`,
      `--default-service=${mockServiceName}-external-backend`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      '--global',
      `--new-hosts=${mockHost}`,
    ]));

    expect(gcloudOutput).toHaveBeenCalledTimes(8);
  });

  it('it should do switch to gke from cloudrun', async () => {

    const status = {
      backends: [{
        group: 'service-name-cloudrun'
      }],
      logConfig: {
        sampleRate: 1.0
      },
      protocol: 'http',
      timeoutSec: '300s',
    };

    gcloudOutput.mockResolvedValueOnce(JSON.stringify(status));
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce();
    gcloudOutput.mockResolvedValueOnce(describeUrlMapNoPathMatcher);
    gcloudOutput.mockResolvedValueOnce();

    await configureExternalDomain(mockProjectID, mockServiceName, mockEnv, mockHost, 'http', 300, true);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, expect.arrayContaining([
      'compute',
      'url-maps',
      'remove-path-matcher',
      `${mockProjectID}-lb-external`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      `--project=${mockProjectID}`,
    ]));
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(3, expect.arrayContaining([
      'compute',
      'backend-services',
      'delete',
      `${mockServiceName}-external-backend`,
      '--global',
      '--quiet',
      `--project=${mockProjectID}`,
    ]));
    
    expect(gcloudOutput).toHaveBeenNthCalledWith(12, expect.arrayContaining([
      'compute',
      'url-maps',
      'add-path-matcher',
      'project-staging-lb-external',
      `--project=${mockProjectID}`,
      `--default-service=${mockServiceName}-external-backend`,
      `--path-matcher-name=${mockServiceName}-external-backend`,
      '--global',
      `--new-hosts=${mockHost}`,
    ]));

    expect(gcloudOutput).toHaveBeenCalledTimes(12);
  });
});
