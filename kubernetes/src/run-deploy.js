const io = require('@actions/io');
const exec = require('@actions/exec');
const path = require('path');
const fs = require('fs');
const clusterInfo = require('../../cloud-run/src/cluster-info');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const execKustomize = require('./kustomize');
const patchDeploymentYaml = require('./patch-deployment-yaml');
const patchConfigMapYaml = require('./patch-configmap-yaml');
const parseEnvironmentArgs = require('./environment-args');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const patchConfigMap = (environmentArgs) => {
  const configMapYamlPath = path.join(process.env.GITHUB_WORKSPACE, 'kustomize', 'configmap.yml');
  let configMapYaml = fs.readFileSync(configMapYamlPath, 'utf8');
  configMapYaml = patchConfigMapYaml(environmentArgs, configMapYaml);
  fs.writeFileSync(configMapYamlPath, configMapYaml);
};

const patchDeployment = (service) => {
  const deploymentYamlPath = path.join(process.env.GITHUB_WORKSPACE, 'kustomize', 'deployment.yml');
  let deploymentYaml = fs.readFileSync(deploymentYamlPath, 'utf8');
  deploymentYaml = patchDeploymentYaml(service, deploymentYaml);
  fs.writeFileSync(deploymentYamlPath, deploymentYaml);
};

const applyWithKubectl = async (deployment) => {
  await exec.exec('kubectl', [
    'apply',
    '-k',
    './kustomize',
  ]);

  await exec.exec('kubectl', [
    'rollout',
    'status',
    'deployment',
    deployment,
    '--namespace',
    deployment,
  ]);
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
) => {
  // put kubernetes configuration in repository
  await io.cp(path.join(__dirname, 'kustomize'), process.env.GITHUB_WORKSPACE, { recursive: true });

  const projectId = await gcloudAuth(serviceAccountKey);
  const {
    cluster,
    clusterLocation,
    project,
  } = await clusterInfo(projectId);

  const args = parseEnvironmentArgs(service.environment, projectId);
  patchConfigMap(args);
  patchDeployment(service);

  const deployment = `hiiretail-${service.name}`;
  await kustomizeNamespace(deployment);
  await kustomizeImage(image);
  await kustomizeLabels(service.name);
  await kustomizeNameSuffix(service.name);
  await kustomizeBuild();

  await authenticateKubeCtl({
    cluster,
    clusterLocation,
    project,
  });

  await applyWithKubectl(deployment);
};

module.exports = runDeploy;
