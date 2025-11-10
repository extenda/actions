const { securitySpec } = require('./security-sidecar');
const { kubernetesCollector } = require('./collector-sidecar');

const volumeSetup = (opa, protocol, type = 'none') => {
  const volumes = [];
  if (opa && type.toLowerCase() !== 'statefulset') {
    if (protocol === 'http2') {
      volumes.push({
        name: 'extenda-certs',
        secret: { secretName: 'envoy-http2-certs' },
      });
    }
  }
  return volumes;
};

const userContainerVolumeMountSetup = (opa, protocol, type, volumes, name) => {
  const volumeMounts = [];
  if (volumes && type.toLowerCase() === 'statefulset') {
    volumeMounts.push({ mountPath: volumes[0]['mount-path'], name });
  }
  if (opa && type === 'Deployment') {
    if (protocol === 'http2') {
      volumeMounts.push({
        mountPath: '/etc/extenda/certs',
        name: 'extenda-certs',
        readOnly: true,
      });
    }
  }
  return volumeMounts;
};

const gkeManifestTemplate = async (
  name,
  type,
  image,
  minInstances,
  maxInstances,
  cpuThreshold,
  cpuRequest,
  memoryRequest,
  environment,
  labels,
  opa,
  protocol,
  volumes,
  opaCpu,
  opaMemory,
  monitoring,
  deployEnv,
  availability,
  baseAnnotations,
  corsEnabled,
  terminationGracePeriod,
  securityPreviewTag,
) => {
  // initialize manifest components

  let annotations = {};
  const deploymentVolumes = volumeSetup(opa, protocol, type);
  const userVolumeMounts = userContainerVolumeMountSetup(
    opa,
    protocol,
    type,
    volumes,
    name,
  );
  const securityContainer = opa
    ? await securitySpec(protocol, true, corsEnabled, securityPreviewTag)
    : {};
  if (opa) {
    securityContainer.env.push({ name: 'CPU_LIMIT', value: `${opaCpu}` });
  }

  const nodeSelector =
    deployEnv === 'staging' || availability === 'low'
      ? { 'cloud.google.com/gke-spot': 'true' }
      : undefined;

  if (availability === 'high' && deployEnv !== 'staging') {
    annotations['cluster-autoscaler.kubernetes.io/safe-to-evict'] = 'false';
  }
  if (Object.keys(annotations).length === 0) {
    annotations = undefined;
  }

  baseAnnotations['cloud.google.com/neg'] =
    `{"exposed_ports":{"80":{"name":"${name}-neg"}}}`;

  let collectorContainer = null;
  if (monitoring) {
    collectorContainer = await kubernetesCollector(name, monitoring);
  }

  // setup manifest

  const namespace = {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name,
    },
  };

  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: {
      name,
      namespace: name,
      annotations: baseAnnotations,
      labels: {
        'networking.gke.io/service-name': name,
      },
    },
    spec: {
      type: 'NodePort',
      selector: {
        app: name,
      },
      ports: [
        {
          protocol: 'TCP',
          port: 80,
          targetPort: opa ? 8000 : 8080,
          name: protocol === 'http' ? 'http' : 'http2',
        },
      ],
    },
  };

  const deployment = {
    apiVersion: 'apps/v1',
    kind: type,
    metadata: {
      name,
      namespace: name,
      labels: {
        app: name,
        ...Object.fromEntries(labels.map((label) => [label.name, label.value])),
      },
    },
    spec: {
      replicas: minInstances,
      selector: {
        matchLabels: {
          app: name,
        },
      },
      ...(volumes && type.toLowerCase() === 'statefulset'
        ? {
            volumeClaimTemplates: [
              {
                metadata: {
                  name: `${name}`,
                },
                spec: {
                  accessModes: ['ReadWriteOnce'],
                  storageClassName:
                    volumes[0]['disk-type'] === 'ssd-balanced'
                      ? 'standard-rwo'
                      : volumes[0]['disk-type'] === 'hdd'
                        ? 'standard'
                        : 'premium-rwo',
                  resources: {
                    requests: {
                      storage: volumes[0].size,
                    },
                  },
                },
              },
            ],
          }
        : {}),
      template: {
        metadata: {
          annotations,
          labels: {
            app: name,
          },
        },
        spec: {
          nodeSelector,
          serviceAccountName: 'workload-identity-sa',
          containers: [
            {
              image,
              imagePullPolicy: 'IfNotPresent',
              name: 'user-container',
              volumeMounts: userVolumeMounts,
              readinessProbe: {
                tcpSocket: {
                  port: 8080,
                },
                initialDelaySeconds: 3,
                periodSeconds: 5,
                failureThreshold: 10,
                timeoutSeconds: 3,
              },
              ports: [
                {
                  containerPort: 8080,
                  protocol: 'TCP',
                },
              ],
              resources: {
                requests: {
                  cpu: cpuRequest,
                  memory: memoryRequest,
                },
                limits: {
                  cpu: cpuRequest,
                  memory: memoryRequest,
                },
              },
              env: [
                {
                  name: 'POD_IP',
                  valueFrom: {
                    fieldRef: {
                      fieldPath: 'status.podIP',
                    },
                  },
                },
                {
                  name: 'CPU_REQUEST',
                  valueFrom: {
                    resourceFieldRef: {
                      containerName: 'user-container',
                      divisor: '1m',
                      resource: 'requests.cpu',
                    },
                  },
                },
                ...environment.map((env) => ({
                  name: env.name,
                  value: env.value,
                })),
              ],
            },
            ...(opa && type === 'Deployment'
              ? [
                  {
                    ...securityContainer,
                    imagePullPolicy: 'IfNotPresent',
                    resources: {
                      requests: {
                        cpu: opaCpu,
                        memory: opaMemory,
                      },
                    },
                    readinessProbe: {
                      httpGet: {
                        path: '/health',
                        port: 9001,
                      },
                      initialDelaySeconds: 5,
                      periodSeconds: 5,
                      timeoutSeconds: 5,
                      failureThreshold: 5,
                    },
                  },
                ]
              : []),
            ...(collectorContainer ? [collectorContainer] : []),
          ],
          terminationGracePeriodSeconds: terminationGracePeriod,
          volumes: deploymentVolumes,
        },
      },
    },
  };

  const hpa = {
    apiVersion: 'autoscaling/v2',
    kind: 'HorizontalPodAutoscaler',
    metadata: {
      name,
      namespace: name,
    },
    spec: {
      scaleTargetRef: {
        apiVersion: 'apps/v1',
        kind: type,
        name,
      },
      minReplicas: minInstances,
      maxReplicas: maxInstances,
      metrics: [
        {
          type: 'Resource',
          resource: {
            name: 'cpu',
            target: {
              type: 'Utilization',
              averageUtilization: cpuThreshold,
            },
          },
        },
      ],
    },
  };

  return [namespace, service, deployment, hpa];
};

module.exports = {
  gkeManifestTemplate,
};
