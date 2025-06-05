const getImageWithSha256 = require('./image-sha256');
const selectSemver = require('../utils/select-semver');
const STABLE_TAG = 'v2.1.2';

const getConfig = (serviceName, monitoring) => {
  const config = {
    prometheus: {
      enabled: false,
    },
    openTelemetry: {
      enabled: false,
    },
  };

  if ('prometheus' in monitoring) {
    const {
      prometheus: { interval = -1, path = '/metrics', port = 8080 },
    } = monitoring;
    config.prometheus = {
      enabled: true,
      interval,
      path,
      port,
      collectorEnv: {
        SERVICE_NAME: serviceName,
        PROMETHEUS_SCRAPE_PATH: path,
        PROMETHEUS_SCRAPE_PORT: port,
        PROMETHEUS_SCRAPE_INTERVAL: interval,
        CONFIG_PROMETHEUS: 'gmp',
      },
    };
  }

  if ('open-telemetry' in monitoring) {
    const {
      'open-telemetry': {
        'set-environment-variables': autoEnvironmentVariables = true,
        config: {
          sampler = 'parentbased_always_off',
          'sampler-ratio': samplerRatio = 1.0,
          propagators = ['b3', 'tracecontext', 'baggage'],
          'otlp-exporter-protocol': otlpProtocol = 'grpc',
          collect = ['traces'],
        },
      },
    } = monitoring;

    config.openTelemetry = {
      enabled: true,
      autoEnvironmentVariables,
      sampler,
      samplerRatio,
      propagators,
      otlpProtocol,
      collect,
      collectorEnv: {
        SERVICE_NAME: serviceName,
        CONFIG_OTEL: 'otel',
      },
    };
  }

  return config;
};

const imageTag = (monitoring = {}) => {
  const { 'preview-tag': collectorPreviewTag = null } = monitoring;
  return selectSemver(
    process.env.OTEL_COLLECTOR_IMAGE_TAG || collectorPreviewTag || STABLE_TAG,
    STABLE_TAG,
  );
};

const cloudRunCollector = async (serviceName, monitoring) => {
  const config = getConfig(serviceName, monitoring || {});

  if (!config.prometheus.enabled && !config.openTelemetry.enabled) {
    return null;
  }

  let env = {};
  if (config.prometheus.enabled) {
    env = { ...env, ...config.prometheus.collectorEnv };
  }

  if (config.openTelemetry.enabled) {
    env = { ...env, ...config.openTelemetry.collectorEnv };
  }

  const image = await getImageWithSha256(
    `eu.gcr.io/extenda/otel-collector:${imageTag(monitoring)}`,
  );

  return {
    image,
    name: 'collector',
    resources: {
      limits: {
        cpu: '0.1',
        memory: '128Mi',
      },
    },
    env: Object.entries(env).map(([name, value]) => ({
      name,
      value: `${value}`,
    })),
    startupProbe: {
      tcpSocket: {
        port: 13133,
      },
      initialDelaySeconds: 0,
      periodSeconds: 240,
      failureThreshold: 1,
      timeoutSeconds: 240,
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
  };
};

const kubernetesCollector = async (serviceName, monitoring) => {
  const config = getConfig(serviceName, monitoring || {});
  if (!config.openTelemetry.enabled) {
    // We use PodMonitorResource for a managed GMP collector per node in GKE.
    return null;
  }

  const image = await getImageWithSha256(
    `eu.gcr.io/extenda/otel-collector:${imageTag()}`,
  );

  const env = config.openTelemetry.collectorEnv;

  return {
    image,
    name: 'collector',
    imagePullPolicy: 'IfNotPresent',
    resources: {
      requests: {
        cpu: '0.1',
        memory: '128Mi',
      },
    },
    env: Object.entries(env).map(([name, value]) => ({
      name,
      value: `${value}`,
    })),
    readinessProbe: {
      httpGet: {
        path: '/health',
        port: 13133,
      },
      initialDelaySeconds: 5,
      periodSeconds: 10,
      timeoutSeconds: 3,
      failureThreshold: 3,
    },
  };
};

const userContainerCollectorEnv = (
  serviceName,
  serviceImage,
  monitoring,
  isProdEnv = true,
) => {
  const { openTelemetry } = getConfig(serviceName, monitoring);

  if (openTelemetry.enabled && openTelemetry.autoEnvironmentVariables) {
    if (!isProdEnv) {
      return {
        OTEL_SDK_DISABLED: 'true',
        OTEL_TRACES_EXPORTER: 'none',
        OTEL_METRICS_EXPORTER: 'none',
        OTEL_LOGS_EXPORTER: 'none',
      };
    }
    const { otlpProtocol, sampler, collect } = openTelemetry;
    const endpoint =
      otlpProtocol === 'grpc'
        ? 'http://localhost:4317'
        : 'http://localhost:4318';
    const env = {
      OTEL_SERVICE_NAME: serviceName,
      OTEL_RESOURCE_ATTRIBUTES: `service.version=${serviceImage.split(':')[1] || 'v0.0.1-local'}`,
      OTEL_TRACES_EXPORTER: collect.includes('traces') ? 'otlp' : 'none',
      OTEL_METRICS_EXPORTER: collect.includes('metrics') ? 'otlp' : 'none',
      OTEL_LOGS_EXPORTER: 'none',
      OTEL_TRACES_SAMPLER: sampler,
      OTEL_PROPAGATORS: openTelemetry.propagators.join(','),
      OTEL_EXPORTER_OTLP_PROTOCOL: otlpProtocol,
      OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
    };
    if (sampler.endsWith('traceidratio')) {
      env.OTEL_TRACES_SAMPLER_ARG = openTelemetry.samplerRatio;
    }
    return env;
  }
  return {};
};

module.exports = {
  imageTag,
  cloudRunCollector,
  kubernetesCollector,
  userContainerCollectorEnv,
};
