const path = require('path');
const fs = require('fs');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const execKustomize = require('./kustomize');
const patchStatefulSetYaml = require('./patch-statefulset-yaml');
const patchDeploymentYaml = require('./patch-deployment-yaml');
const patchServiceYaml = require('./patch-service-yaml');
const patchConfigMapYaml = require('./patch-configmap-yaml');
const parseEnvironmentArgs = require('./environment-args');
const createBaseKustomize = require('./create-base-kustomize');
const applyKubectl = require('./apply-kubectl');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const applyAutoscale = require('./autoscale');

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
  createBaseKustomize(service.name);

  const projectId = await gcloudAuth(serviceAccountKey);
  const cluster = await getClusterInfo(projectId);

  patchManifest('service.yml', (yml) => patchServiceYaml(service, yml));

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
  await authenticateKubeCtl(cluster);
  await createNamespace(projectId, opaEnabled, service.name);

  await kustomizeNamespace(service.name);
  await kustomizeImage(image);
  await kustomizeLabels(service.name);
  await kustomizeBuild();

  await applyKubectl(service.name, deploymentType, dryRun);

  await applyAutoscale(service.name, deploymentType, service.autoscale, service.replicas, dryRun)
};

module.exports = runDeploy;
