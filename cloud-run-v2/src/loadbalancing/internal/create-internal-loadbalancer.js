const gcloudOutput = require("../../utils/gcloud-output");
const core = require('@actions/core');

const createLoadbalancer = async (projectID, env, backendService) => gcloudOutput([
  'compute',
  'url-maps',
  'create',
  projectID.split("-" + env)[0] + "-" + env + "-lb-internal",
  `--project=${projectID}`,
  `--region=europe-west1`,
  `--default-service=${backendService}`,
]).catch(() => false);

const createInternalLoadbalancer = async (projectID, env, name) => {
  //TODO: check if loadbalancer exists and return
  const backendService = `${name}-internal-backend`;
  await createLoadbalancer(projectID, env, backendService);
}

module.exports = createInternalLoadbalancer;
