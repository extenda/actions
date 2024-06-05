const collectorSpec = require('../../src/manifests/collector-sidecar');
const getImageWithSha256 = require('../../src/manifests/image-sha256');

jest.mock('../../src/manifests/image-sha256');

describe('collector-sidecar', () => {
  beforeEach(() => {
    getImageWithSha256.mockResolvedValueOnce('eu.gcr.io/extenda/run-gmp-collector@sha256:123');
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('It returns null if interval is missing', async () => {
    const container = await collectorSpec(undefined);
    expect(container).toBeNull();
  });
  test('It creates a collector container', async () => {
    const container = await collectorSpec({
      prometheus: {
        path: '/metrics',
        port: 8081,
        interval: 15,
      },
    });
    expect(container).toEqual({
      image: 'eu.gcr.io/extenda/run-gmp-collector@sha256:123',
      name: 'collector',
      resources: {
        limits: {
          cpu: '0.1',
          memory: '128Mi',
        },
      },
      env: [
        { name: 'SCRAPE_PATH', value: '/metrics' },
        { name: 'SCRAPE_PORT', value: '8081' },
        { name: 'SCRAPE_INTERVAL', value: '15' },
      ],
    });
  });
});
