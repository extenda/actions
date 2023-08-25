const core = require('@actions/core');
const buildManifest = require('./manifests/build-manifest');
const loadServiceDefinition = require('./utils/service-definition');
const deploy = require('./manifests/deploy');
const projectInfo = require('../../cloud-run/src/project-info');
const createExternalLoadbalancer = require('./loadbalancing/external/create-external-loadbalancer');
const configureInternalDomain = require('./loadbalancing/internal/create-internal-backend');
const configureExternalDomain = require('./loadbalancing/external/create-external-backend');
const configureExternalLBFrontend = require('./loadbalancing/external/create-external-frontend');
const configureInternalFrontend = require('./loadbalancing/internal/create-internal-frontend');
const { run, failIfNotTrunkBased } = require('../../utils');
const setupGcloud = require('../../setup-gcloud-base/src/setup-gcloud');
const loadCredentials = require('./utils/load-credentials');

const action = async () => {
  const serviceAccountKeyPipeline = core.getInput('service-account-key-pipeline-secrets', { required: false });
  const serviceAccountKeyCICD = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const image = core.getInput('image', { required: true });
  const migrate = core.getInput('migrate') || 'false';
  // const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();
  const projectID = await setupGcloud(serviceAccountKeyCICD);

  const {
    project: clanName,
    env,
  } = projectInfo(projectID);

  const styraToken = await loadCredentials(serviceAccountKeyPipeline, env);

  const deployYaml = loadServiceDefinition(serviceFile);
  const {
    kubernetes,
    environments,
  } = deployYaml;

  const {
    staging,
    production,
  } = environments;

  const {
    'domain-mappings': domainMappings,
  } = env === 'staging' ? staging : production;

  const serviceName = kubernetes.service;
  const { protocol } = kubernetes;

  // setup manifests (hpa, deploy, negs)
  const version = new Date().getTime();
  await buildManifest(image, deployYaml, projectID, clanName, env, styraToken);
  const succesfullDeploy = await deploy(projectID, serviceName, version);

  if (succesfullDeploy) {
    await createExternalLoadbalancer(projectID, env);
    if (domainMappings) {
      await configureExternalLBFrontend(projectID, env, domainMappings, migrate);
      await configureExternalDomain(projectID, serviceName, env, domainMappings, protocol);
    }
    await configureInternalDomain(projectID, serviceName, env, protocol);
    await configureInternalFrontend(projectID, serviceName, env);
  } else {
    throw new Error('Deployment failed! Check container logs and status for error!');
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
