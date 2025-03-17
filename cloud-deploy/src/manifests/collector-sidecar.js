const getImageWithSha256 = require('./image-sha256');

const getConfig = (monitoring) => {
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
          propagators = ['tracecontext', 'baggage'],
          'otlp-exporter-protocol': otlpProtocol = 'grpc',
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
      collectorEnv: {
        CONFIG_OTEL: 'otel',
      },
    };
  }

  return config;
};

const cloudRunCollector = async (monitoring) => {
  const config = getConfig(monitoring || {});

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
    'eu.gcr.io/extenda/otel-collector:v2.0.0',
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

const kubernetesCollector = async (monitoring) => {
  const config = getConfig(monitoring || {});
  if (!config.openTelemetry.enabled) {
    // We use PodMonitorResource for a managed GMP collector per node in GKE.
    return null;
  }

  const image = await getImageWithSha256(
    'eu.gcr.io/extenda/otel-collector:v2.0.0',
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

const userContainerCollectorEnv = (serviceName, serviceImage, monitoring) => {
  const { openTelemetry } = getConfig(monitoring);

  if (openTelemetry.enabled && openTelemetry.autoEnvironmentVariables) {
    const { otlpProtocol, sampler } = openTelemetry;
    const endpoint =
      otlpProtocol === 'grpc'
        ? 'http://localhost:4318'
        : 'http://localhost:4317';
    const env = {
      OTEL_SERVICE_NAME: serviceName,
      OTEL_RESOURCE_ATTRIBUTES: `service.version=${serviceImage.split(':')[1] || 'v0.0.1-local'}`,
      OTEL_TRACES_EXPORTER: 'otlp',
      OTEL_METRICS_EXPORTER: 'otlp',
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
  cloudRunCollector,
  kubernetesCollector,
  userContainerCollectorEnv,
};
