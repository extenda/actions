const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const { addNamespace } = require('../utils/add-namespace');
const securitySpec = require('./security-sidecar');
const readSecret = require('../utils/load-credentials');
const handleStatefulset = require('./statefulset-workaround');
const checkIamSystem = require('./check-system');
const checkVpcConnector = require('../utils/check-vpc-connector');
const getRevisions = require('../cloudrun/get-revisions');
const {
  configMapManifest,
  removeScalerConfiguration,
} = require('./vpa-scaler-configmap');
const connectToCluster = require('../utils/cluster-connection');
const { deletePodMonitor, podMonitorManifest } = require('./pod-monitoring');
const collectorSidecar = require('./collector-sidecar');

const convertToYaml = (json) => yaml.dump(json);

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

const configureNetworking = async (
  annotations,
  enableDirectVPC,
  enableCloudNAT,
  connector,
  connectorName,
) => {
  if (enableDirectVPC) {
    annotations['run.googleapis.com/network-interfaces'] =
      '[{"network":"clan-network","subnetwork":"cloudrun-subnet"}]';
  } else if (connector && !enableDirectVPC) {
    annotations['run.googleapis.com/vpc-access-connector'] = `${connectorName}`;
  } else if (!connector && !enableDirectVPC) {
    annotations['run.googleapis.com/network-interfaces'] =
      '[{"network":"clan-network","subnetwork":"k8s-subnet"}]';
  }
  if (enableCloudNAT) {
    annotations['run.googleapis.com/vpc-access-egress'] = 'all-traffic';
    if (enableDirectVPC) {
      annotations['run.googleapis.com/network-interfaces'] =
        '[{"network":"clan-network","subnetwork":"k8s-subnet"}]';
    }
  } else {
    annotations['run.googleapis.com/vpc-access-egress'] = 'private-ranges-only';
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
  connector,
  connectorName,
  activeRevisionName,
  audiences,
  monitoring,
  deployEnv,
  baseAnnotations,
  enableCloudNAT,
  enableDirectVPC,
  corsEnabled,
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
  // baseAnnotations['run.googleapis.com/launch-stage'] = 'BETA';
  // baseAnnotations['run.googleapis.com/binary-authorization'] = 'default';

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

  await configureNetworking(
    annotations,
    enableDirectVPC,
    enableCloudNAT,
    connector,
    connectorName,
  );
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
    const securityContainer = await securitySpec(protocol, false, corsEnabled);
    securityContainer.env.push({ name: 'CPU_LIMIT', value: `${opaCpu}` });
    securityContainer.resources = resources;
    securityContainer.volumeMounts = undefined;
    containers.push(securityContainer);
  }

  if (monitoring && deployEnv !== 'staging') {
    // We only collect metrics in prod.
    const collectorContainer = await collectorSidecar(monitoring);
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

  const service = {
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
  deployEnv,
  availability,
  baseAnnotations,
  corsEnabled,
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
    ? await securitySpec(protocol, true, corsEnabled)
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
                    volumes[0]['disk-type'] === 'hdd'
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
              },
              env: environment.map((env) => ({
                name: env.name,
                value: env.value,
              })),
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
          ],
          terminationGracePeriodSeconds: 90,
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

const createSkaffoldManifest = async (target) => {
  let apiVersion = 'skaffold/v2beta16';
  const kind = 'Config';
  let deploy = {
    kubectl: {
      manifests: ['k8s(deploy)-*'],
    },
  };
  if (target === 'cloudrun') {
    apiVersion = 'skaffold/v4beta6';
    const manifests = {
      rawYaml: ['cloudrun-service.yaml'],
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

const createCloudDeployPipe = async (
  name,
  projectID,
  clanName,
  env,
  target = 'gke',
) => `apiVersion: deploy.cloud.google.com/v1
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
  generateManifest(
    'skaffold.yaml',
    convertToYaml(await createSkaffoldManifest(target)),
  );
  generateManifest(
    'clouddeploy.yaml',
    await createCloudDeployPipe(name, projectID, clanName, env, target),
  );
};

const buildManifest = async (
  image,
  deployYaml,
  projectId,
  clanName,
  deployEnv,
  timeout,
  http2Certificate,
  internalCert,
  internalCertKey,
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

  const githubServerUrl = process.env.GITHUB_SERVER_URL;
  const githubRepo = process.env.GITHUB_REPOSITORY;
  const githubRunID = process.env.GITHUB_RUN_ID;
  const githubRunAttempt = process.env.GITHUB_RUN_ATTEMPT;
  const jobTrigger =
    `${githubServerUrl}/${githubRepo}/actions/runs/${githubRunID}/attempts/${githubRunAttempt}`.toLowerCase();
  const baseAnnotations = {
    'job-trigger': `${jobTrigger}`,
  };

  const {
    type = {},
    service: name,
    protocol,
    availability = null,
    resources,
    scaling,
    volumes,
    traffic = {},
    monitoring = {},
  } = kubernetes || cloudrun;

  const { staging, production } = environments;

  const {
    'serve-traffic': serveTraffic = true,
    'static-egress-ip': enableCloudNAT = true,
    'direct-vpc-connection': enableDirectVPC = false,
  } = traffic;

  const {
    'permission-prefix': permissionPrefix,
    'auth-proxy': authProxy = 'envoy-opa',
    resources: opaResources = { cpu: 0.5, memory: '512Mi' },
    'system-name': systemName = name,
    consumers = {},
    cors: { enabled: corsEnabled = false } = {},
  } = security === 'none' ? {} : security || {};

  const { audiences = [] } = consumers;

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

      SQLInstanceName = await readSecret(
        cicdServiceAccount,
        deployEnv,
        secretName,
        'SQL_INSTANCE_NAME',
      );
    }
  }

  const serviceAccount = `${name}@${projectId}.iam.gserviceaccount.com`;

  await prepareGcloudDeploy(
    name,
    projectId,
    clanName,
    deployEnv,
    kubernetes ? 'gke' : 'cloudrun',
  );
  if (permissionPrefix && authProxy === 'envoy-opa') {
    opa = true;
    const bundleName = `${permissionPrefix}.${systemName}-${deployEnv}`;
    if (!(await checkIamSystem(bundleName))) {
      throw new Error(`Bundle not found with the name ${bundleName}`);
    } else {
      // Our new GCS system name.
      process.env.IAM_SYSTEM_NAME = bundleName;
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
      deployEnv,
      availability,
      baseAnnotations,
      corsEnabled,
    );

    await connectToCluster(clanName, deployEnv, projectId);
    if (scaling.vertical) {
      generateManifest(
        'k8s(deploy)-configmap.yaml',
        await configMapManifest(
          name,
          type,
          resources.cpu,
          resources.memory,
          scaling.vertical,
        ),
      );
    } else {
      await removeScalerConfiguration(name);
    }

    if (type === 'StatefulSet' && volumes) {
      await handleStatefulset(name, volumes[0].size);
    }
    const convertedManifests = manifests
      .map((doc) => convertToYaml(doc))
      .join('---\n');
    generateManifest('k8s(deploy)-manifest.yaml', convertedManifests);
    generateManifest(
      'k8s(deploy)-certificates.yaml',
      await addNamespace(http2Certificate, name),
    );

    if (deployEnv !== 'staging') {
      const podMonitor = podMonitorManifest(name, monitoring);
      if (podMonitor) {
        core.info('Create PodMonitoring resource');
        generateManifest(
          'k8s(deploy)-podmonitor.yaml',
          convertToYaml(podMonitor),
        );
      } else {
        await deletePodMonitor(name);
      }
    }
  } else {
    const {
      'cpu-throttling': cpuThrottling = true,
      'startup-cpu-boost': cpuBoost = false,
      'session-affinity': sessionAffinity = false,
      'vpc-connector': connector = true,
    } = cloudrun;

    let connectorName = `${clanName}-vpc-connector`;
    if (connector) {
      connectorName = await checkVpcConnector(
        projectId,
        'europe-west1',
        connectorName,
      );
    }

    for (const env of envArray) {
      const { value } = env;
      if (value.includes('sm://')) {
        const secretName = value.split('/').pop();
        env.valueFrom = {
          secretKeyRef: {
            key: 'latest',
            name: secretName,
          },
        };
        env.value = undefined;
      }
    }

    let activeRevisionName = '';
    if (!serveTraffic && deployEnv !== 'staging') {
      core.info('Checking active revisions');
      activeRevisionName = await getRevisions(
        name,
        projectId,
        'europe-west1',
      ).then((revisions) => {
        const checkMultipleActive = [];
        for (const revision of revisions) {
          if (revision.active === true) {
            checkMultipleActive.push(revision.name);
          }
        }
        if (checkMultipleActive.length > 1) {
          throw new Error(
            '2 active revisions found, set revision to 100% traffic before deploying',
          );
        }
        return checkMultipleActive[0];
      });
    }

    const cloudrunManifest = await cloudrunManifestTemplate(
      name,
      image,
      opa,
      labelArray,
      protocol,
      envArray,
      minInstances,
      maxInstances,
      scaling,
      resources.cpu,
      resources.memory,
      opaResources.cpu,
      opaResources.memory,
      timeout,
      serviceAccount,
      SQLInstanceName,
      cpuThrottling,
      cpuBoost,
      sessionAffinity,
      connector,
      connectorName,
      activeRevisionName,
      audiences,
      monitoring,
      deployEnv,
      baseAnnotations,
      enableCloudNAT,
      enableDirectVPC,
      corsEnabled,
    );
    generateManifest('cloudrun-service.yaml', convertToYaml(cloudrunManifest));
  }
  generateManifest('cert.cert', internalCert);
  generateManifest('key.key', internalCertKey);

  if (!fs.existsSync('.gcloudignore')) {
    fs.writeFileSync(
      '.gcloudignore',
      `*
!k8s(deploy)-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`,
      { encoding: 'utf-8' },
    );
  }
};

module.exports = buildManifest;
