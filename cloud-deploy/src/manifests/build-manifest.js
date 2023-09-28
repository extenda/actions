const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const checkSystem = require('./check-system');
const buildOpaConfig = require('./opa-config');
const { addNamespace } = require('../utils/add-namespace');
const securitySpec = require('./security-sidecar');
const readSecret = require('../utils/load-credentials');

const convertToYaml = (json) => yaml.dump(json);

const volumeSetup = (opa, protocol, type = 'none') => {
  const volumes = [];
  if (opa && type.toLowerCase() !== 'statefulset') {
    volumes.push({ name: 'opa', configMap: { name: 'opa-envoy-config' } });
    if (protocol === 'http2') {
      volumes.push({ name: 'extenda-certs', secret: { secretName: 'envoy-http2-certs' } });
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
      volumeMounts.push({ mountPath: '/etc/extenda/certs', name: 'extenda-certs', readOnly: true });
    }
  }
  return volumeMounts;
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
  containerConcurrency,
  cpu,
  memory,
  opaCpu,
  opaMemory,
  timeoutSeconds,
  serviceAccountName,
  SQLInstance,
) => {
  labels.push({ 'cloud.googleapis.com/location': 'europe-west1' });
  const volumes = opa ? volumeSetup(opa, protocol) : undefined;
  const ports = opa ? undefined : [{ name: protocol === 'http2' ? 'h2c' : 'http', containerPort: 8080 }];

  const annotations = {
    'run.googleapis.com/execution-environment': 'gen2',
    'autoscaling.knative.dev/minScale': minInstances,
    'autoscaling.knative.dev/maxScale': maxInstances,
    'run.googleapis.com/network-interfaces': '[{"network":"clan-network","subnetwork":"k8s-subnet"}]',
    'run.googleapis.com/vpc-access-egress': 'all-traffic',
  };

  if (SQLInstance) {
    annotations['run.googleapis.com/cloudsql-instances'] = SQLInstance;
  }

  const containers = [{
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
    })),
    startupProbe: {
      tcpSocket: {
        port: 8080,
      },
      initialDelaySeconds: 3,
      periodSeconds: 5,
      failureThreshold: 10,
      timeoutSeconds: 3,
    },
  }];

  if (opa) {
    const resources = {
      limits: {
        cpu: opaCpu,
        memory: opaMemory,
      },
    };
    const securityContainer = await securitySpec(protocol);
    securityContainer.resources = resources;
    containers.push(securityContainer);
  }

  const service = {
    apiVersion: 'serving.knative.dev/v1',
    kind: 'Service',
    metadata: {
      name,
      labels: {
        app: name,
        ...Object.fromEntries(labels.map((label) => [label.name, label.value])),
      },
      annotations: {
        'run.googleapis.com/launch-stage': 'BETA',
        'run.googleapis.com/ingress': 'internal-and-cloud-load-balancing',
      },
    },
    spec: {
      template: {
        metadata: {
          annotations,
        },
        spec: {
          containerConcurrency,
          timeoutSeconds,
          serviceAccountName,
          containers,
          volumes,
        },
      },
      traffic: [{
        percent: 100,
        latestRevision: true,
      }],
    },
  };

  /*
      volumes:
      - name: opa
        secret:
          secretName: opa-config
          items:
          - key: latest
            path: conf.yaml
*/

  return service;
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
  const securityContainer = opa ? await securitySpec(protocol) : {};

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
              ? [{
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
              }]
              : []),
          ],
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

const createSkaffoldManifest = async (target) => {
  let apiVersion = 'skaffold/v2beta16';
  const kind = 'Config';
  let deploy = {
    kubectl: {
      manifests: [
        'k8s(deploy)-*',
      ],
    },
  };
  if (target === 'cloudrun') {
    apiVersion = 'skaffold/v4beta6';
    const manifests = {
      rawYaml: [
        'cloudrun-service.yaml',
      ],
    };
    deploy = {
      cloudrun: {},
    };
    return {
      apiVersion,
      kind,
      manifests,
      deploy,
    };
  }

  return {
    apiVersion,
    kind,
    deploy,
  };
};

const createCloudDeployPipe = async (name, projectID, clanName, env, target = 'gke') => `apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: ${name}
description: ${name} pipeline
serialPipeline:
  stages:
  - targetId: ${target}
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: gke
description: k8s-cluster
gke:
  cluster: projects/${projectID}/locations/europe-west1/clusters/${clanName}-cluster-${env}
---
apiVersion: deploy.cloud.google.com/v1
kind: Target
metadata:
  name: cloudrun
description: cloudrun deployment
run:
  location: projects/${projectID}/locations/europe-west1
`;

const generateManifest = (fileName, content) => {
  core.info(`generating ${fileName}`);
  if (!content) {
    core.error(`content is undefined for ${fileName}`);
  }
  fs.writeFileSync(fileName, content, { encoding: 'utf-8' });
};

const prepareGcloudDeploy = async (name, projectID, clanName, env, target) => {
  generateManifest('skaffold.yaml', convertToYaml(await createSkaffoldManifest(target)));
  generateManifest('clouddeploy.yaml', await createCloudDeployPipe(name, projectID, clanName, env, target));
};

const buildManifest = async (
  image,
  deployYaml,
  projectId,
  clanName,
  deployEnv,
  styraToken,
  timeout,
  http2Certificate,
  internalCert,
  internalCertKey,
  externalCert,
  externalCertKey,
  cicdServiceAccount,
) => {
  let opa = false;
  let SQLInstanceName;

  const {
    'cloud-run': cloudrun,
    kubernetes,
    labels = [],
    security,
    environments = [],
  } = deployYaml;

  const {
    type = {},
    service: name,
    protocol,
    resources,
    scaling,
    volumes,
  } = kubernetes || cloudrun;

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
    'max-instances': maxInstances = 100,
    env: environment = [],
  } = deployEnv === 'staging' ? staging : production;

  const envArray = Object.entries(environment).map(([key, value]) => ({
    name: key,
    value: value.replace('sm://*/', `sm://${projectId}/`),
  }));

  // Default label values.
  if (!labels['tenant-alias']) {
    labels['tenant-alias'] = 'multi-tenant';
  }
  if (!labels['iso-country']) {
    labels['iso-country'] = 'global';
  }

  const labelArray = Object.entries(labels).map(([key, value]) => ({
    name: key,
    value,
  }));

  envArray.push({ name: 'SERVICE_NAME', value: name });
  envArray.push({ name: 'SERVICE_PROJECT_ID', value: projectId });
  envArray.push({ name: 'SERVICE_ENVIRONMENT', value: deployEnv });
  envArray.push({ name: 'SERVICE_CONTAINER_IMAGE', value: image });
  envArray.push({ name: 'CLAN_NAME', value: clanName });

  // check if env contains SQL_INSTANCE_NAME
  for (const envVar of envArray) {
    if (envVar.name === 'SQL_INSTANCE_NAME') {
      const secretName = envVar.value.split('/').pop();
      /* eslint-disable no-await-in-loop */
      SQLInstanceName = await readSecret(cicdServiceAccount, deployEnv, secretName, 'SQL_INSTANCE_NAME');
      /* eslint-enable no-await-in-loop */
    }
  }

  const serviceAccount = `${name}@${projectId}.iam.gserviceaccount.com`;

  await prepareGcloudDeploy(name, projectId, clanName, deployEnv, kubernetes ? 'gke' : 'cloudrun');
  if (permissionPrefix) {
    opa = true;
    const styraUrl = 'https://extendaretail.svc.styra.com';
    const styraSystemName = `${permissionPrefix}.${name}-${deployEnv}`;
    const system = await checkSystem(styraSystemName, styraToken, styraUrl);
    if (system.id === '') {
      throw new Error(`Styra system not found with the name ${styraSystemName}`);
    } else {
      generateManifest('k8s(deploy)-opa-config.yaml', await buildOpaConfig(system.id, styraToken, name, styraUrl));
    }
  }
  if (kubernetes) {
    envArray.push({ name: 'PORT', value: '8080' });
    envArray.push({ name: 'K_SERVICE', value: name });

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
    generateManifest('k8s(deploy)-manifest.yaml', convertedManifests);
    generateManifest('k8s(deploy)-certificates.yaml', await addNamespace(http2Certificate, name));
  } else {
    const cloudrunManifest = await cloudrunManifestTemplate(
      name,
      image,
      false, // set to variable opa once implemented
      labelArray,
      protocol,
      envArray,
      minInstances,
      maxInstances,
      scaling.concurrency,
      resources.cpu,
      resources.memory,
      opaResources.cpu,
      opaResources.memory,
      timeout,
      serviceAccount,
      SQLInstanceName,
    );
    generateManifest('cloudrun-service.yaml', convertToYaml(cloudrunManifest));
  }
  generateManifest('cert.cert', internalCert);
  generateManifest('key.key', internalCertKey);
  generateManifest('external_cert.cert', externalCert);
  generateManifest('external_key.key', externalCertKey);

  if (!fs.existsSync('.gcloudignore')) {
    fs.writeFileSync('.gcloudignore', `*
!k8s(deploy)-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`, { encoding: 'utf-8' });
  }
};

module.exports = buildManifest;
