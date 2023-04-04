const configureDomains = require('./loadbalancing/configure-backend');
const { buildManifest } = require('./manifests/build-manifest');
const core = require('@actions/core');
const loadServiceDefinition = require('./utils/service-definition');
const jsonSchema = require('./utils/cloud-run-schema');
const deploy = require('./manifests/deploy');
const kubectl = require('./utils/kubectl');
const projectInfo = require('./utils/project-info');
const { failIfNotTrunkBased } = require('../../utils/src/');


const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const image = core.getInput('image', { required: true });
  const verbose = (core.getInput('verbose') || 'false');

  failIfNotTrunkBased();
  
  const projectID = await kubectl.configure(serviceAccountKey);
  const service = loadServiceDefinition(serviceFile, jsonSchema);


  const {
    project : clanName,
    env,
  } = projectInfo(projectID);

  //setup manifests (hpa, deploy, negs)
  await buildManifest(image, service);
  await deploy(service.name);

  const {
   platform,
   name
  } = service;
  let host = '';
  if (env === 'staging') {
    host = platform.gke["domain-mappings"].staging;
  } else {
    host = platform.gke["domain-mappings"].prod;
  }

  await configureDomains(projectID, name, host, env, clanName);

};

if (require.main === module) {
  run(action);
}

module.exports = action;

action();