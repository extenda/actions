const path = require('path');
const fs = require('fs');
const clusterInfo = require('../../cloud-run/src/cluster-info');
const createNamespace = require('../../cloud-run/src/create-namespace');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const execKustomize = require('./kustomize');
const patchStatefulSetYaml = require('./patch-statefulset-yaml');
const patchConfigMapYaml = require('./patch-configmap-yaml');
const parseEnvironmentArgs = require('./environment-args');
const createBaseKustomize = require('./create-base-kustomize');
const applyKubectl = require('./apply-kubectl');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const patchConfigMap = (environmentArgs) => {
  const configMapYamlPath = path.join('kustomize', 'configmap.yml');
  let configMapYaml = fs.readFileSync(configMapYamlPath, 'utf8');
  configMapYaml = patchConfigMapYaml(environmentArgs, configMapYaml);
  fs.writeFileSync(configMapYamlPath, configMapYaml);
};

const patchStatefulSet = (service) => {
  const statefulSetYamlPath = path.join('kustomize', 'statefulSet.yml');
  let statefulSetYaml = fs.readFileSync(statefulSetYamlPath, 'utf8');
  statefulSetYaml = patchStatefulSetYaml(service, statefulSetYaml);
  fs.writeFileSync(statefulSetYamlPath, statefulSetYaml);
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

  const args = parseEnvironmentArgs(service.environment, projectId);
  patchConfigMap(args);
  patchStatefulSet(service);

  const opaEnabled = 'skip';
  await createNamespace(projectId, opaEnabled, cluster, deploymentName);

  await kustomizeNamespace(deploymentName);
  await kustomizeImage(image);
  await kustomizeLabels(service.name);
  await kustomizeNameSuffix(service.name);
  await kustomizeBuild();

  await applyKubectl(deploymentName, dryRun);
};

module.exports = runDeploy;
