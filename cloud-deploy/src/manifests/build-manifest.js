const fs = require('fs');
const yaml = require('js-yaml');
const checkSystem = require('./check-system');
const buildOpaConfig = require('./opa-config');

const convertToYaml = (json) => yaml.dump(json);

const volumeSetup = (opa, protocol, type) => {
  const volumes = [];
  if (opa && type === 'Deployment') {
    volumes.push({ name: 'opa', configMap: { name: 'opa-envoy-config' } });
    if (protocol === 'http2') {
      volumes.push({ name: 'extenda-certs', secret: { secretName: 'envoy-http2-certs' } });
    }
  }
  return volumes;
};

const securityContainerVolumeMountSetup = (opa, protocol, type) => {
  const volumeMounts = [];
  if (opa && type === 'Deployment') {
    volumeMounts.push({ mountPath: '/config', name: 'opa', readOnly: true });
    if (protocol === 'http2') {
      volumeMounts.push({ mountPath: '/etc/extenda/certs', name: 'extenda-certs', readOnly: true });
    }
  }
  return volumeMounts;
};

const userContainerVolumeMountSetup = (opa, protocol, type, volumes, name) => {
  const volumeMounts = [];
  if (volumes && type.toLowerCase() === 'statefulset') {
    volumeMounts.push({ mountPath: volumes[0]['mount-path'], name });
  }
  if (opa && type === 'Deployment') {
    if (protocol === 'http2') {
      volumeMounts.push({ mountPath: '/etc/extenda/certs', name: 'extenda-certs', readOnly: true });
    }
  }
  return volumeMounts;
};

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
  opaCpu,
  opaMemory,
) => {
  const deploymentVolumes = volumeSetup(opa, protocol, type);
  const userVolumeMounts = userContainerVolumeMountSetup(opa, protocol, type, volumes, name);
  const securityVolumeMounts = securityContainerVolumeMountSetup(
    opa,
    protocol,
    type,
    volumes,
    name,
  );

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
              },
              env: environment.map((env) => ({
                name: env.name,
                value: env.value,
              })),
            },
            ...(opa && type === 'Deployment'
              ? [
                {
                  image: 'eu.gcr.io/extenda/security:authz',
                  name: 'security-auth',
                  ports: [
                    {
                      containerPort: 9001,
                    },
                  ],
                  imagePullPolicy: 'IfNotPresent',
                  resources: {
                    requests: {
                      cpu: opaCpu,
                      memory: opaMemory,
                    },
                  },
                  env: [{
                    name: 'ENVOY_PROTOCOL',
                    value: protocol === 'http' ? 'http' : 'http2',
                  }],
                  volumeMounts: securityVolumeMounts,
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
          ],
          volumes: deploymentVolumes,
          ...(volumes && type.toLowerCase() === 'statefulset'
            ? {
              volumeClaimTemplates: [
                {
                  metadata: {
                    name: `${name}`,
                  },
                  spec: {
                    accessModes: ['ReadWriteOnce'],
                    storageClassName: volumes[0]['disk-type'] === 'hdd' ? 'standard' : 'premium-rwo',
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

const buildManifest = async (
  image,
  deployYaml,
  projectId,
  clanName,
  deployEnv,
  styraToken,
  http2Certificate,
  internalCert,
  internalCertKey,
) => {
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
    'permission-prefix': permissionPrefix,
    resources: opaResources = { cpu: 0.5, memory: '512Mi' },
  } = (security === 'none' ? {} : security || {});

  const {
    'min-instances': minInstances,
    'max-instances': maxInstances,
    env: environment = [],
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
  envArray.push({ name: 'PORT', value: '8080' });
  envArray.push({ name: 'K_SERVICE', value: name });

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
    opaResources.cpu,
    opaResources.memory,
  );

  const convertedManifests = manifests.map((doc) => convertToYaml(doc)).join('---\n');
  await generateManifest('k8s-manifest.yaml', convertedManifests);
  await generateManifest('k8s-certificates.yaml', http2Certificate);
  await generateManifest('cert.cert', internalCert);
  await generateManifest('key.key', internalCertKey);
};

module.exports = buildManifest;
