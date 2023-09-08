const securitySpec = require('../../src/manifests/security-sidecar');
const gcloudOutput = require('../../src/utils/gcloud-output');

jest.mock('../../src/utils/gcloud-output');

describe('manifests/security-sidecar', () => {
  beforeEach(() => {
    gcloudOutput.mockResolvedValueOnce(`[
  {
    "digest": "sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396",
    "tags": [
      "66d83f7268fd539ba053dcae1e8f40d9b00601f2",
      "authz",
      "v0.2.0"
    ],
    "timestamp": {
      "datetime": "2023-09-07 16:37:06+02:00",
      "day": 7,
      "fold": 0,
      "hour": 16,
      "microsecond": 0,
      "minute": 37,
      "month": 9,
      "second": 6,
      "year": 2023
    }
  }
]
`);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It invokes gcloud list-images with correct args', async () => {
    await securitySpec('http');
    expect(gcloudOutput).toHaveBeenCalledWith([
      'container',
      'images',
      'list-tags',
      'eu.gcr.io/extenda/security',
      '--filter="tags:authz"',
      '--format=json',
    ]);
  });
  test('It uses a sha256 digest with image', async () => {
    const security = await securitySpec('http');
    expect(security).toMatchObject({
      image: 'eu.gcr.io/extenda/security@sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396',
    });
  });

  test('It creates security without certs for http/1.1', async () => {
    const security = await securitySpec('http');
    expect(security).toEqual({
      name: 'security-authz',
      image: 'eu.gcr.io/extenda/security@sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396',
      ports: [{ containerPort: 9001 }],
      env: [{
        name: 'ENVOY_PROTOCOL',
        value: 'http',
      }],
      volumeMounts: [{
        mountPath: '/config',
        name: 'opa',
        readOnly: true,
      }],
    });
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });

  test('It mounts certificates for http/2', async () => {
    const security = await securitySpec('http2');
    expect(security).toMatchObject({
      env: [{
        name: 'ENVOY_PROTOCOL',
        value: 'http2',
      }],
      volumeMounts: [
        {
          mountPath: '/config',
          name: 'opa',
          readOnly: true,
        },
        {
          mountPath: '/etc/extenda/certs',
          name: 'extenda-certs',
          readOnly: true,
        }],
    });
    expect(gcloudOutput).toHaveBeenCalledTimes(1);
  });
});
