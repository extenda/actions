const {
  cloudRunCollector,
  kubernetesCollector,
  userContainerCollectorEnv,
} = require('../../src/manifests/collector-sidecar');
const getImageWithSha256 = require('../../src/manifests/image-sha256');

jest.mock('../../src/manifests/image-sha256');

const image = 'eu.gcr.io/extenda/my-service:v1.0.0';

describe('collector-sidecar', () => {
  beforeEach(() => {
    getImageWithSha256.mockResolvedValueOnce(
      'eu.gcr.io/extenda/otel-collector@sha256:123',
    );
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  test('It returns null if interval is missing', async () => {
    const container = await cloudRunCollector('test', undefined);
    expect(container).toBeNull();
  });
  test('It creates a Cloud Run collector container for GMP', async () => {
    const container = await cloudRunCollector(
      'test',
      {
        prometheus: {
          path: '/metrics',
          port: 8081,
          interval: 15,
        },
      },
      'v1.5.5',
    );
    expect(container).toEqual({
      image: 'eu.gcr.io/extenda/otel-collector@sha256:123',
      name: 'collector',
      resources: {
        limits: {
          cpu: '0.1',
          memory: '128Mi',
        },
      },
      env: [
        { name: 'SERVICE_NAME', value: 'test' },
        { name: 'PROMETHEUS_SCRAPE_PATH', value: '/metrics' },
        { name: 'PROMETHEUS_SCRAPE_PORT', value: '8081' },
        { name: 'PROMETHEUS_SCRAPE_INTERVAL', value: '15' },
        { name: 'CONFIG_PROMETHEUS', value: 'gmp' },
      ],
      startupProbe: {
        tcpSocket: {
          port: 13133,
        },
        initialDelaySeconds: 0,
        periodSeconds: 240,
        timeoutSeconds: 240,
        failureThreshold: 1,
      },
      livenessProbe: {
        httpGet: {
          path: '/health',
          port: 13133,
        },
        initialDelaySeconds: 5,
        periodSeconds: 10,
        timeoutSeconds: 3,
        failureThreshold: 3,
      },
    });
  });
  test('It creates a security-authz pipeline for GMP for new security-authz', async () => {
    const container = await cloudRunCollector(
      'test',
      {
        prometheus: {
          path: '/metrics',
          port: 8081,
          interval: 15,
        },
      },
      'v1.6.0',
    );
    expect(container).toMatchObject({
      name: 'collector',
      env: [
        { name: 'SERVICE_NAME', value: 'test' },
        { name: 'PROMETHEUS_SCRAPE_PATH', value: '/metrics' },
        { name: 'PROMETHEUS_SCRAPE_PORT', value: '8081' },
        { name: 'PROMETHEUS_SCRAPE_INTERVAL', value: '15' },
        { name: 'CONFIG_PROMETHEUS', value: 'gmp' },
        {
          name: 'CONFIG_PROMETHEUS_PIPELINES',
          value: 'user-container security-authz',
        },
      ],
    });
  });
  test('It does not create a GKE collector for GMP', async () => {
    const container = await kubernetesCollector('test', {
      prometheus: {
        interval: 60,
      },
    });
    expect(container).toBeNull();
  });
  test('It creates GKE collector for Open Telemetry, but not GMP', async () => {
    const container = await kubernetesCollector('test', {
      prometheus: {
        interval: 60,
      },
      'open-telemetry': {
        config: 'auto',
      },
    });
    expect(container).toEqual({
      name: 'collector',
      image: 'eu.gcr.io/extenda/otel-collector@sha256:123',
      imagePullPolicy: 'IfNotPresent',
      resources: {
        requests: {
          cpu: '0.1',
          memory: '128Mi',
        },
      },
      env: [
        { name: 'SERVICE_NAME', value: 'test' },
        { name: 'CONFIG_OTEL', value: 'otel' },
      ],
      readinessProbe: {
        httpGet: {
          path: '/health',
          port: 13133,
        },
        failureThreshold: 3,
        initialDelaySeconds: 5,
        periodSeconds: 10,
        timeoutSeconds: 3,
      },
    });
  });
  test('It sets default OTEL environment for user-container', () => {
    const env = userContainerCollectorEnv('my-service', image, {
      'open-telemetry': {
        config: 'auto',
      },
    });
    expect(env).toEqual({
      OTEL_SERVICE_NAME: 'my-service',
      OTEL_RESOURCE_ATTRIBUTES: 'service.version=v1.0.0',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'none',
      OTEL_LOGS_EXPORTER: 'none',
      OTEL_TRACES_SAMPLER: 'parentbased_always_off',
      OTEL_PROPAGATORS: 'b3,tracecontext,baggage',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4317',
    });
  });
  test('It sets custom OTEL environment for user-container', () => {
    const env = userContainerCollectorEnv(
      'my-service',
      'image-no-tag',
      {
        'open-telemetry': {
          config: {
            'otlp-exporter-protocol': 'http/protobuf',
            sampler: 'traceidratio',
            'sampler-ratio': '0.5',
            propagators: ['tracecontext'],
            collect: ['traces', 'metrics'],
          },
        },
      },
      true,
    );
    expect(env).toEqual({
      OTEL_SERVICE_NAME: 'my-service',
      OTEL_RESOURCE_ATTRIBUTES: 'service.version=v0.0.1-local',
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'otlp',
      OTEL_LOGS_EXPORTER: 'none',
      OTEL_TRACES_SAMPLER: 'traceidratio',
      OTEL_TRACES_SAMPLER_ARG: '0.5',
      OTEL_PROPAGATORS: 'tracecontext',
      OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
      OTEL_EXPORTER_OTLP_ENDPOINT: 'http://localhost:4318',
    });
  });
  test('It does not set OTEL environment if OTEL is not enabled', async () => {
    const env = userContainerCollectorEnv(
      'my-service',
      image,
      {
        prometheus: {
          interval: 60,
        },
      },
      true,
    );
    expect(env).toEqual({});
  });
  test('It disabled OTEL on staging', async () => {
    const env = userContainerCollectorEnv(
      'my-service',
      image,
      {
        'open-telemetry': {
          config: 'auto',
        },
      },
      false,
    );
    expect(env).toEqual({
      OTEL_SDK_DISABLED: 'true',
      OTEL_TRACES_EXPORTER: 'none',
      OTEL_METRICS_EXPORTER: 'none',
      OTEL_LOGS_EXPORTER: 'none',
    });
  });
});
