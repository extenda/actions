const fs = require('fs');
const yaml = require('js-yaml');
const checkSystem = require('./check-system');
const buildOpaConfig = require('./opa-config');

const convertToYaml = (json) => yaml.dump(json);

const manifestTemplate = async (
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
  envoyCpu,
  envoyMemory,
  opaCpu,
  opaMemory,
) => {
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
      annotations: {
        'cloud.google.com/neg': `{"exposed_ports":{"80":{"name":"${name}-neg"}}}`,
      },
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
      template: {
        metadata: {
          labels: {
            app: name,
          },
        },
        spec: {
          serviceAccountName: 'workload-identity-sa',
          containers: [
            {
              image,
              imagePullPolicy: 'IfNotPresent',
              name: 'user-container',
              ...(volumes && type.toLowerCase() === 'statefulset'
                ? {
                  volumeMounts: [
                    {
                      mountPath: volumes['mount-path'],
                      name,
                    },
                  ],
                }
                : {}),
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
              },
              env: environment.map((env) => ({
                name: env.name,
                value: env.value,
              })),
            },
            ...(opa && type === 'Deployment'
              ? [
                {
                  image: `eu.gcr.io/extenda/envoy:${protocol === 'http' ? 'http' : 'grpc'}`,
                  ports: [
                    {
                      containerPort: 8000,
                      protocol: 'TCP',
                    },
                  ],
                  imagePullPolicy: 'IfNotPresent',
                  resources: {
                    requests: {
                      cpu: envoyCpu,
                      memory: envoyMemory,
                    },
                  },
                  name: 'envoy',
                },
                {
                  image: 'openpolicyagent/opa:0.50.2-envoy-rootless',
                  name: 'opa',
                  ports: [
                    {
                      containerPort: 8181,
                    },
                  ],
                  imagePullPolicy: 'IfNotPresent',
                  resources: {
                    requests: {
                      cpu: opaCpu,
                      memory: opaMemory,
                    },
                  },
                  args: ['run', '--server', '--config-file=/config/conf.yaml', '--log-level=error'],
                  volumeMounts: [
                    {
                      name: 'opa',
                      readOnly: true,
                      mountPath: '/config',
                    },
                  ],
                  readinessProbe: {
                    httpGet: {
                      path: '/health?bundles',
                      port: 8181,
                    },
                    initialDelaySeconds: 10,
                    periodSeconds: 5,
                    timeoutSeconds: 5,
                    failureThreshold: 5,
                  },
                },
              ]
              : []),
          ],
          volumes: opa && type === 'Deployment' ? [{ name: 'opa', configMap: { name: 'opa-envoy-config' } }] : [],
          ...(volumes && type.toLowerCase() === 'statefulset'
            ? {
              volumeClaimTemplates: [
                {
                  metadata: {
                    name: `${name}`,
                  },
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    storageClassName: volumes['disk-type'] === 'hdd' ? 'standard' : 'premium-rwo',
                    resources: {
                      requests: {
                        storage: volumes.size,
                      },
                    },
                  },
                },
              ],
            }
            : {}),
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
        kind: 'deployment',
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

  if (minInstances === maxInstances) {
    return [namespace, service, deployment];
  }

  return [namespace, service, deployment, hpa];
};

const createSkaffoldManifest = async () => `apiVersion: skaffold/v2beta16
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s-*
`;

const createCloudDeployPipe = async (name, projectID, clanName, env) => `apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: ${name}
description: ${name} pipeline
serialPipeline:
  stages:
  - targetId: gke
    profiles: []
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke
description: k8s-cluster
gke:
  cluster: projects/${projectID}/locations/europe-west1/clusters/${clanName}-cluster-${env}
  `;

const generateManifest = async (fileName, content) => {
  fs.writeFile(`${fileName}`, content, (err) => {
    if (err) throw err;
  });
};

const prepareGcloudDeploy = async (name, projectID, clanName, env) => {
  await generateManifest('skaffold.yaml', await createSkaffoldManifest());
  await generateManifest('clouddeploy.yaml', await createCloudDeployPipe(name, projectID, clanName, env));
};

const buildManifest = async (image, deployYaml, projectId, clanName, deployEnv, styraToken) => {
  let opa = false;

  const {
    kubernetes,
    labels = [],
    security,
    environments = [],
    volumes,
  } = deployYaml;

  const {
    type,
    service: name,
    protocol,
    resources,
    scaling,
  } = kubernetes;

  const {
    staging,
    production,
  } = environments;

  const {
    'open-policy-agent': openpolicyagent,
    envoy,
  } = security;

  const {
    resources: opaResources = { cpu: 0.5, memory: '512Mi' },
    'permission-prefix': permissionPrefix,
  } = openpolicyagent || {};

  const {
    resources: envoyResources = { cpu: 0.5, memory: '512Mi' },
  } = envoy || {};

  const {
    'min-instances': minInstances,
    'max-instances': maxInstances,
    env: environment,
  } = deployEnv === 'staging' ? staging : production;

  const envArray = Object.entries(environment).map(([key, value]) => ({
    name: key,
    value: value.match(/^[0-9]+$/) == null ? value.replace('*', projectId) : `'${value}'`,
  }));

  const labelArray = Object.entries(labels).map(([key, value]) => ({
    name: key,
    value,
  }));

  envArray.push({ name: 'SERVICE_NAME', value: name });
  envArray.push({ name: 'SERVICE_PROJECT_ID', value: projectId });
  envArray.push({ name: 'SERVICE_ENVIRONMENT', value: deployEnv });
  envArray.push({ name: 'SERVICE_CONTAINER_IMAGE', value: image });
  envArray.push({ name: 'CLAN_NAME', value: clanName });

  await prepareGcloudDeploy(name, projectId, clanName, deployEnv);
  if (permissionPrefix) {
    opa = true;
    const styraUrl = 'https://extendaretail.svc.styra.com';
    const styraSystemName = `${permissionPrefix}.${name}-${deployEnv}`;
    const system = await checkSystem(styraSystemName, styraToken, styraUrl);
    if (system.id === '') {
      throw new Error(`Styra system not found with the name ${styraSystemName}`);
    } else {
      await generateManifest('k8s-opa-config.yaml', await buildOpaConfig(system.id, styraToken, name, styraUrl));
    }
  }

  const manifests = await manifestTemplate(
    name,
    type,
    image,
    minInstances,
    maxInstances,
    scaling.cpu,
    resources.cpu,
    resources.memory,
    envArray,
    labelArray,
    opa,
    protocol,
    volumes,
    envoyResources.cpu,
    envoyResources.memory,
    opaResources.cpu,
    opaResources.memory,
  );

  const convertedManifests = manifests.map((doc) => convertToYaml(doc)).join('---\n');
  await generateManifest('k8s-manifest.yaml', convertedManifests);
};

module.exports = buildManifest;
