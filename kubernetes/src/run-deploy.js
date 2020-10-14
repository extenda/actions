const path = require('path');
const fs = require('fs');
const clusterInfo = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const execKustomize = require('./kustomize');
const patchStatefulSetYaml = require('./patch-statefulset-yaml');
const patchDeploymentYaml = require('./patch-deployment-yaml');
const patchConfigMapYaml = require('./patch-configmap-yaml');
const parseEnvironmentArgs = require('./environment-args');
const createBaseKustomize = require('./create-base-kustomize');
const applyKubectl = require('./apply-kubectl');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const patchManifest = (manifest, patcher) => {
  const yamlPath = path.join('kustomize', manifest);
  let deploymentYaml = fs.readFileSync(yamlPath, 'utf8');
  deploymentYaml = patcher(deploymentYaml);
  fs.writeFileSync(yamlPath, deploymentYaml);
};

const kustomizeNamespace = async (namespace) => {
  await execKustomize([
    'edit',
    'set',
    'namespace',
    namespace,
  ]);
};

const kustomizeImage = async (image) => {
  await execKustomize([
    'edit',
    'set',
    'image',
    `eu.gcr.io/extenda/IMAGE:TAG=${image}`,
  ]);
};

const kustomizeLabels = async (name) => {
  await execKustomize([
    'edit',
    'add',
    'label',
    `app:${name}`,
  ]);
};

const kustomizeNameSuffix = async (name) => {
  await execKustomize([
    'edit',
    'set',
    'namesuffix',
    '--',
    `-${name}`,
  ]);
};

const kustomizeBuild = async () => {
  await execKustomize([
    'build',
  ]);
};

const kustomizeResource = async (resource) => {
  await execKustomize([
    'edit',
    'add',
    'resource',
    resource,
  ]);
};

const runDeploy = async (
  serviceAccountKey,
  service,
  image,
  dryRun,
) => {
  const deploymentName = `hiiretail-${service.name}`;
  createBaseKustomize(deploymentName);

  const projectId = await gcloudAuth(serviceAccountKey);
  const cluster = await clusterInfo(projectId);

  patchManifest('configmap.yml', (yml) => {
    const args = parseEnvironmentArgs(service.environment, projectId);
    return patchConfigMapYaml(args, yml);
  });

  const deploymentType = service.storage ? 'statefulset' : 'deployment';
  if (deploymentType === 'statefulset') {
    patchManifest('statefulSet.yml', (yml) => patchStatefulSetYaml(service, yml));
    await kustomizeResource('statefulSet.yml');
  } else {
    patchManifest('deployment.yml', (yml) => patchDeploymentYaml(service, yml));
    await kustomizeResource('deployment.yml');
  }

  const opaEnabled = 'skip';
  await createNamespace(projectId, opaEnabled, cluster, deploymentName);

  await kustomizeNamespace(deploymentName);
  await kustomizeImage(image);
  await kustomizeLabels(service.name);
  await kustomizeNameSuffix(service.name);
  await kustomizeBuild();

  await applyKubectl(deploymentName, deploymentType, dryRun);
};

module.exports = runDeploy;
