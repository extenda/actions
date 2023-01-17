const path = require('path');
const fs = require('fs');
const { getClusterInfo } = require('../../cloud-run/src/cluster-info');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const checkNamespaceExists = require('./check-namespace-exists');
const execKustomize = require('./kustomize');
const patchStatefulSetYaml = require('./patch-statefulset-yaml');
const patchDeploymentYaml = require('./patch-deployment-yaml');
const patchServiceYaml = require('./patch-service-yaml');
const patchConfigMapYaml = require('./patch-configmap-yaml');
const parseEnvironmentArgs = require('./environment-args');
const createBaseKustomizeFiles = require('./create-base-kustomize');
const applyKubectl = require('./apply-kubectl');
const checkRequiredNumberOfPodsIsRunning = require('./check-number-of-pods-running');
const authenticateKubeCtl = require('../../cloud-run/src/kubectl-auth');
const applyAutoscale = require('./autoscale');
const { getImageDigest } = require('../../utils/src');

/**
 * Downloads, configures, authenticates to GCloud.
 * Creates some environmental variables.
 * @returns projectId in form of id from gcp. Example: enterprise-staging-fc38.
 */
const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

/**
 * Applies patch function to the kubernetes manifest file.
 * Reads file from filesystem. Writes it back to the same place after patch is applied.
 * @param manifest Kubernetes manifest file name.
 * File must exist in ./kustomize folder. Ex.: statefulset.yml
 * @param patcher Function to be applied to the manifest file.
 */
const patchManifest = (manifest, patcher) => {
  const yamlPath = path.join('kustomize', manifest);
  let deploymentYaml = fs.readFileSync(yamlPath, 'utf8');
  deploymentYaml = patcher(deploymentYaml) || Buffer.from('');
  fs.writeFileSync(yamlPath, deploymentYaml);
};

/**
 * Sets namespace using kustomize.
 * @param namespace Namespace name to be set.
 */
const kustomizeNamespace = async (namespace) => {
  await execKustomize([
    'edit',
    'set',
    'namespace',
    namespace,
  ]);
};

/**
 * Sets the image to be used during deployment.
 * @param image Image to be used during deployment.
 */
const kustomizeImage = async (image) => {
  const imageDigest = await getImageDigest(image);
  await execKustomize([
    'edit',
    'set',
    'image',
    `eu.gcr.io/extenda/IMAGE:TAG=${imageDigest}`,
  ]);
};

/**
 * Adds labels to deployment.
 * @param service.labels Custom Labels to be added.
 * @param service.name Label to be added.
 */
const kustomizeLabels = async (service, projectId) => {
  // If there are any service.labels add them
  if (service.labels !== undefined) {
    const { labels } = service;
    let labelKey = '';
    const promises = [];
    for (labelKey in labels) {
      if (Object.prototype.hasOwnProperty.call(labels, labelKey)) {
        promises.push(execKustomize([
          'edit',
          'add',
          'label',
          `${labelKey}:${labels[labelKey]}`,
        ]));
      }
    }
    await Promise.all(promises);
  }

  // Always add the app label
  await execKustomize([
    'edit',
    'add',
    'label',
    `app:${service.name}`,
  ]);

  // Always add environment label, projectId should always include staging or prod.
  const environment = projectId.includes('-staging-') ? 'staging' : 'prod';
  await execKustomize([
    'edit',
    'add',
    'label',
    `environment:${environment}`,
  ]);
};

/**
 * Runs kustomize build.
 */
const kustomizeBuild = async () => {
  await execKustomize([
    'build',
  ]);
};

/**
 * Adds resource specification.
 * @param {*} resource Resource to be used during deployment.
 */
const kustomizeResource = async (resource) => {
  await execKustomize([
    'edit',
    'add',
    'resource',
    resource,
  ]);
};

/**
 * Prepares kubernetes files and deploys the new version of the application.
 * @param serviceAccountKey The service account key which will be used for authentication.
 The account key should be a base64 encoded JSON key stored as a secret.
 * @param serviceDefinition The service specification definition.
 * @param image The Docker image to deploy to Kubernetes.
 * @param dryRun Instructs not to perform actual kubernetes deployment.
 * Set to 'true' to only simulate deploying the final Kubernetes manifest.
 */
const runDeploy = async (
  serviceAccountKey,
  serviceDefinition,
  image,
  dryRun,
) => {
  // Gets some info from gcloud.
  const projectId = await gcloudAuth(serviceAccountKey);
  const cluster = await getClusterInfo(projectId);

  // Creates kustomize files.
  createBaseKustomizeFiles(serviceDefinition.name);

  // Adds ports and removes clusterIp from spec
  patchManifest('service.yml', (ymlFileName) => patchServiceYaml(serviceDefinition, ymlFileName));

  // Adds environment variables specified in the definition
  // as well as SERVICE_PROJECT_ID and SERVICE_ENVIRONMENT.
  patchManifest('configmap.yml', (ymlFileName) => {
    const args = parseEnvironmentArgs(serviceDefinition.environment, projectId);
    return patchConfigMapYaml(args, ymlFileName);
  });

  // The storage being requested requires the deployment type to be StatefulSet.
  const deploymentType = serviceDefinition.storage ? 'statefulset' : 'deployment';

  // Change parameters to the ones specified in the definition:
  // replicas, storage as well as requests and limits for the resources.
  if (deploymentType === 'statefulset') {
    patchManifest('statefulSet.yml', (ymlFileName) => patchStatefulSetYaml(serviceDefinition, ymlFileName));
    await kustomizeResource('statefulSet.yml');
  } else {
    patchManifest('deployment.yml', (ymlFileName) => patchDeploymentYaml(serviceDefinition, ymlFileName));
    await kustomizeResource('deployment.yml');
  }

  // Authenticates kubectl command against cluster.
  await authenticateKubeCtl(cluster);

  // Checks namespace existence in GCP.
  await checkNamespaceExists(serviceDefinition.name);

  // Run kustomize commands for resource files
  await kustomizeNamespace(serviceDefinition.name);
  await kustomizeImage(image);
  await kustomizeLabels(serviceDefinition, projectId);

  // Run kustomize build
  await kustomizeBuild();

  // Applies the kustomizations and triggers a rolling update
  await applyKubectl(serviceDefinition.name, deploymentType, dryRun);

  await checkRequiredNumberOfPodsIsRunning(
    serviceDefinition.name,
    serviceDefinition.replicas,
    5000,
    dryRun,
  );

  // Applies autoscale if the configuration exists in service definition
  // Deletes existing autoscale definition if the configuration is not found in service definition
  await applyAutoscale(
    serviceDefinition.name,
    deploymentType,
    serviceDefinition.autoscale,
    serviceDefinition.replicas,
    dryRun,
  );
};

module.exports = runDeploy;
