const core = require('@actions/core');
const buildManifest = require('./manifests/build-manifest');
const loadServiceDefinition = require('./utils/service-definition');
const jsonSchema = require('./utils/cloud-run-schema');
const deploy = require('./manifests/deploy');
const projectInfo = require('../../cloud-run/src/project-info');
const createExternalLoadbalancer = require('./loadbalancing/external/create-external-loadbalancer');
const configureInternalDomain = require('./loadbalancing/internal/create-internal-backend');
const configureExternalDomain = require('./loadbalancing/external/create-external-backend');
const configureExternalLBFrontend = require('./loadbalancing/external/create-external-frontend');
const configureInternalFrontend = require('./loadbalancing/internal/create-internal-frontend');
const { run, failIfNotTrunkBased } = require('../../utils');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const image = core.getInput('image', { required: true });
  // const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();
  const projectID = await setupGcloud(serviceAccountKey);
  const service = loadServiceDefinition(serviceFile, jsonSchema);

  const {
    project: clanName,
    env,
  } = projectInfo(projectID);

  const {
    platform,
    name,
  } = service;

  // setup manifests (hpa, deploy, negs)
  const version = new Date().getTime();
  await buildManifest(image, service, projectID, clanName, env);
  const succesfullDeploy = await deploy(projectID, service.name, version);
  if (succesfullDeploy) {
    let host = [];
    if (env === 'staging') {
      host = platform.gke['domain-mappings'].staging;
    } else {
      host = platform.gke['domain-mappings'].prod;
    }

    await createExternalLoadbalancer(projectID, env);
    if (host) {
      await configureExternalLBFrontend(projectID, env, host);
      await configureExternalDomain(projectID, name, env, host);
    }
    await configureInternalDomain(projectID, name, env);
    await configureInternalFrontend(projectID, name, env);
  } else {
    throw new Error('Deployment failed! Check container logs and status for error!');
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
