const { securitySpec } = require('./security-sidecar');
const { cloudRunCollector } = require('./collector-sidecar');

const configureNetworking = async (
  annotations,
  enableDirectVPC,
  enableCloudNAT,
) => {
  if (enableDirectVPC) {
    if (enableCloudNAT) {
      annotations['run.googleapis.com/network-interfaces'] =
        '[{"network":"clan-network","subnetwork":"nat-subnet"}]';
      annotations['run.googleapis.com/vpc-access-egress'] = 'all-traffic';
    } else {
      annotations['run.googleapis.com/network-interfaces'] =
        '[{"network":"clan-network","subnetwork":"cloudrun-subnet"}]';
      annotations['run.googleapis.com/vpc-access-egress'] =
        'private-ranges-only';
    }
  }
};

const cloudrunManifestTemplate = async (
  name,
  image,
  opa,
  labels,
  protocol,
  environment,
  minInstances,
  maxInstances,
  scaling,
  cpu,
  memory,
  opaCpu,
  opaMemory,
  timeoutSeconds,
  serviceAccountName,
  SQLInstance,
  cpuThrottling,
  cpuBoost,
  sessionAffinity,
  activeRevisionName,
  audiences,
  monitoring,
  deployEnv,
  baseAnnotations,
  enableCloudNAT,
  enableDirectVPC,
  corsEnabled,
  securityPreviewTag,
) => {
  labels.push({ 'cloud.googleapis.com/location': 'europe-west1' });

  const ports = opa
    ? undefined
    : [
        {
          name: protocol === 'http2' ? 'h2c' : 'http1',
          containerPort: 8080,
        },
      ];
  const containerConcurrency = scaling.concurrency;

  baseAnnotations['run.googleapis.com/ingress'] =
    'internal-and-cloud-load-balancing';
  baseAnnotations['run.googleapis.com/binary-authorization'] = 'default';
  if (audiences.length > 0) {
    baseAnnotations['run.googleapis.com/custom-audiences'] =
      `[${audiences.map((audience) => `"${audience}"`)}]`;
  }

  const annotations = {
    'run.googleapis.com/execution-environment': 'gen2',
    'autoscaling.knative.dev/minScale': minInstances,
    'autoscaling.knative.dev/maxScale': maxInstances,
    'run.googleapis.com/cpu-throttling': `${cpuThrottling}`,
    'run.googleapis.com/startup-cpu-boost': `${cpuBoost}`,
    'run.googleapis.com/sessionAffinity': `${sessionAffinity}`,
  };

  if (scaling.schedule && minInstances > 0) {
    baseAnnotations['run.googleapis.com/launch-stage'] = 'BETA';
    baseAnnotations['run.googleapis.com/minScale'] = minInstances;
    annotations['autoscaling.knative.dev/minScale'] = 0;
  }

  await configureNetworking(annotations, enableDirectVPC, enableCloudNAT);
  if (SQLInstance) {
    annotations['run.googleapis.com/cloudsql-instances'] = SQLInstance;
  }
  const traffic = [
    {
      percent: 100,
      latestRevision: true,
    },
  ];

  if (activeRevisionName !== '') {
    traffic[0].percent = 0;
    traffic.push({
      percent: 100,
      revisionName: activeRevisionName,
    });
  }

  const containers = [
    {
      image,
      name: 'user-container',
      ports,
      resources: {
        limits: {
          cpu,
          memory,
        },
      },
      env: environment.map((env) => ({
        name: env.name,
        value: env.value,
        valueFrom: env.valueFrom,
      })),
      startupProbe: {
        tcpSocket: {
          port: 8080,
        },
        initialDelaySeconds: 0,
        periodSeconds: 240,
        failureThreshold: 1,
        timeoutSeconds: 240,
      },
    },
  ];

  if (opa) {
    const resources = {
      limits: {
        cpu: opaCpu,
        memory: opaMemory,
      },
    };
    const securityContainer = await securitySpec(
      protocol,
      false,
      corsEnabled,
      securityPreviewTag,
    );
    securityContainer.env.push({ name: 'CPU_LIMIT', value: `${opaCpu}` });
    securityContainer.resources = resources;
    securityContainer.volumeMounts = undefined;
    containers.push(securityContainer);
  }

  if (monitoring && deployEnv !== 'staging') {
    // We only collect metrics in prod.
    const collectorContainer = await cloudRunCollector(name, monitoring);
    if (collectorContainer) {
      containers.push(collectorContainer);
      // The collector should start after and shutdown before the user-container.
      annotations['run.googleapis.com/container-dependencies'] = JSON.stringify(
        {
          collector: ['user-container'],
        },
      );
    }
  }

  return {
    apiVersion: 'serving.knative.dev/v1',
    kind: 'Service',
    metadata: {
      name,
      labels: {
        app: name,
        ...Object.fromEntries(labels.map((label) => [label.name, label.value])),
      },
      annotations: baseAnnotations,
    },
    spec: {
      template: {
        metadata: {
          annotations,
          labels: {
            app: name,
            ...Object.fromEntries(
              labels.map((label) => [label.name, label.value]),
            ),
          },
        },
        spec: {
          containerConcurrency,
          timeoutSeconds,
          serviceAccountName,
          containers,
        },
      },
      traffic,
    },
  };
};

module.exports = {
  cloudrunManifestTemplate,
};
