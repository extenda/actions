import * as core from '@actions/core';
import fs from 'fs';
import yaml from 'js-yaml';

import getRevisions from '../cloudrun/get-revisions.js';
import { addNamespace } from '../utils/add-namespace.js';
import connectToCluster from '../utils/cluster-connection.js';
import readSecret from '../utils/load-credentials.js';
import { gkeManifestTemplate } from './build-manifests-gke.js';
import { cloudrunManifestTemplate } from './build-manifests-run.js';
import checkIamSystem from './check-system.js';
import { userContainerCollectorEnv } from './collector-sidecar.js';
import { deletePodMonitor, podMonitorManifest } from './pod-monitoring.js';
import handleStatefulset from './statefulset-workaround.js';
import {
  configMapManifest,
  removeScalerConfiguration,
} from './vpa-scaler-configmap.js';

const convertToYaml = (json) => yaml.dump(json);

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
    'direct-vpc-connection': enableDirectVPC = true,
  } = traffic;

  const {
    'permission-prefix': permissionPrefix,
    'auth-proxy': authProxy = 'envoy-opa',
    resources: opaResources = { cpu: 0.5, memory: '512Mi' },
    'system-name': systemName = name,
    consumers = {},
    cors: { enabled: corsEnabled = false } = {},
    'preview-tag': securityPreviewTag = null,
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

  if (cloudrun) {
    const { 'request-logs': { 'cloud-run': enableCloudRunLogs = true } = {} } =
      cloudrun;
    if (enableCloudRunLogs === false) {
      // Add label used by exclude-filter that removes cloud-run request logs.
      labels['exclude-logs'] = 'cloud-run';
    }
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

  // Add open telemetry config to the user-container.
  Object.entries(userContainerCollectorEnv(name, image, monitoring)).forEach(
    ([key, value]) => {
      envArray.push({ name: key, value });
    },
  );

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
    const terminationGracePeriod = kubernetes['termination-grace-period'] || 90;

    const manifests = await gkeManifestTemplate(
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
      monitoring,
      deployEnv,
      availability,
      baseAnnotations,
      corsEnabled,
      terminationGracePeriod,
      securityPreviewTag,
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

    const podMonitor = podMonitorManifest(name, monitoring, opa);
    if (podMonitor) {
      core.info('Create PodMonitoring resource');
      generateManifest(
        'k8s(deploy)-podmonitor.yaml',
        convertToYaml(podMonitor),
      );
    } else {
      await deletePodMonitor(name);
    }
  } else {
    const {
      'cpu-throttling': cpuThrottling = true,
      'startup-cpu-boost': cpuBoost = false,
      'session-affinity': sessionAffinity = false,
    } = cloudrun;

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
      activeRevisionName,
      audiences,
      monitoring,
      deployEnv,
      baseAnnotations,
      enableCloudNAT,
      enableDirectVPC,
      corsEnabled,
      securityPreviewTag,
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

export default buildManifest;
