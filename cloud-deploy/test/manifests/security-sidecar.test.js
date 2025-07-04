const {
  STABLE_VERSION,
  securitySpec,
} = require('../../src/manifests/security-sidecar');
const getImageWithSha256 = require('../../src/manifests/image-sha256');

jest.mock('../../src/manifests/image-sha256');

const originalEnv = process.env;

describe('manifests/security-sidecar', () => {
  beforeEach(() => {
    getImageWithSha256.mockResolvedValueOnce(
      'eu.gcr.io/extenda/security@sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396',
    );
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It invokes gcloud list-images with correct args', async () => {
    process.env.IAM_SYSTEM_NAME = 'tst.test-prod';
    await securitySpec('http');
    expect(getImageWithSha256).toHaveBeenCalledWith(
      `eu.gcr.io/extenda/security:${STABLE_VERSION}`,
    );
  });

  test('It uses native-authz from SECURITY_IMAGE_TAG env var', async () => {
    process.env.IAM_SYSTEM_NAME = 'tst.test-staging';
    process.env.SECURITY_IMAGE_TAG = 'native-authz';
    await securitySpec('http');
    expect(getImageWithSha256).toHaveBeenCalledWith(
      'eu.gcr.io/extenda/security:native-authz',
    );
  });

  test('It uses a sha256 digest with image', async () => {
    const security = await securitySpec('http');
    expect(security).toMatchObject({
      image:
        'eu.gcr.io/extenda/security@sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396',
    });
  });

  test('It creates security without certs for http/1.1', async () => {
    const security = await securitySpec('http');
    expect(security).toEqual({
      name: 'security-authz',
      image:
        'eu.gcr.io/extenda/security@sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396',
      ports: [{ name: 'http1', containerPort: 8000 }],
      env: [
        {
          name: 'LAUNCHDARKLY_SDK_KEY',
          value: '',
        },
        {
          name: 'OPA_CONFIG_SYSTEM_NAME',
          value: '',
        },
        {
          name: 'ENVOY_CORS',
          value: 'false',
        },
        {
          name: 'ENVOY_PROTOCOL',
          value: 'http',
        },
      ],
      livenessProbe: {
        httpGet: {
          path: '/health',
          port: 9001,
        },
        initialDelaySeconds: 5,
        periodSeconds: 10,
        timeoutSeconds: 3,
        failureThreshold: 3,
      },
      volumeMounts: [],
    });
    expect(getImageWithSha256).toHaveBeenCalledTimes(1);
  });

  test('It mounts certificates for http/2', async () => {
    const security = await securitySpec('http2');
    expect(security).toMatchObject({
      env: [
        {
          name: 'LAUNCHDARKLY_SDK_KEY',
          value: '',
        },
        {
          name: 'OPA_CONFIG_SYSTEM_NAME',
          value: '',
        },
        {
          name: 'ENVOY_CORS',
          value: 'false',
        },
        {
          name: 'ENVOY_PROTOCOL',
          value: 'http2',
        },
      ],
      volumeMounts: [
        {
          mountPath: '/etc/extenda/certs',
          name: 'extenda-certs',
          readOnly: true,
        },
      ],
    });
    expect(getImageWithSha256).toHaveBeenCalledTimes(1);
  });

  test('It sets h2c on ENVOY_PROTOCOL for cloudrun', async () => {
    const security = await securitySpec('http2', false, true);
    expect(security).toMatchObject({
      env: [
        {
          name: 'LAUNCHDARKLY_SDK_KEY',
          value: '',
        },
        {
          name: 'OPA_CONFIG_SYSTEM_NAME',
          value: '',
        },
        {
          name: 'ENVOY_CORS',
          value: 'true',
        },
        {
          name: 'ENVOY_PROTOCOL',
          value: 'h2c',
        },
      ],
    });
    expect(getImageWithSha256).toHaveBeenCalledTimes(1);
  });

  test('It supports custom bucket name', async () => {
    process.env.SECURITY_BUCKET_NAME = 'my-bucket';
    const security = await securitySpec('http', false, false);
    expect(security).toMatchObject({
      env: [
        {
          name: 'LAUNCHDARKLY_SDK_KEY',
          value: '',
        },
        {
          name: 'OPA_CONFIG_SYSTEM_NAME',
          value: '',
        },
        {
          name: 'ENVOY_CORS',
          value: 'false',
        },
        {
          name: 'ENVOY_PROTOCOL',
          value: 'http',
        },
        {
          name: 'OPA_CONFIG_BUCKET_NAME',
          value: 'my-bucket',
        },
      ],
    });
  });
});
