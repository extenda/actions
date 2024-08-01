const fixPathMatchers = require('../../../src/loadbalancing/external/fix-path-matchers');
const gcloudOutput = require('../../../src/utils/gcloud-output');

jest.mock('../../../src/utils/gcloud-output', () =>
  jest.fn().mockImplementation(() => Promise.resolve()),
);

const describeUrlMap = JSON.stringify({
  creationTimestamp: '2020-00-00T00:00:00.000-07:00',
  defaultService:
    'https://www.googleapis.com/compute/v1/projects/project-staging/global/backendBuckets/def',
  fingerprint: 'jfockNs=',
  hostRules: [
    {
      hosts: ['example.org', 'test.retailsvc.com'],
      pathMatcher: 'service-name-external-backend',
    },
  ],
  pathMatchers: [
    {
      defaultService:
        'https://www.googleapis.com/compute/v1/projects/project-staging/global/backendServices/service-name-external-backend',
      name: 'service-name-external-backend',
    },
  ],
});

describe('configureExternalDomain', () => {
  const mockProjectID = 'project-staging';
  const mockServiceName = 'service-name';
  const mockEnv = 'staging';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should setup domain and backend correctly', async () => {
    gcloudOutput.mockResolvedValueOnce(describeUrlMap);

    await fixPathMatchers(mockProjectID, mockEnv, mockServiceName);

    expect(gcloudOutput).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        'compute',
        'url-maps',
        'describe',
        expect.any(String),
      ]),
    );
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });
});
