const gcloudOutput = require('../../utils/gcloud-output');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const createLoadbalancer = async (projectID, env, backendService) => gcloudOutput([
  'compute',
  'url-maps',
  'create',
  `${projectWithoutNumbers(projectID, env)}-lb-internal`,
  `--project=${projectID}`,
  '--region=europe-west1',
  `--default-service=${backendService}`,
]);

const createInternalLoadbalancer = async (projectID, env, name) => {
  // TODO: check if loadbalancer exists and return
  const backendService = `${name}-internal-backend`;
  return createLoadbalancer(projectID, env, backendService);
};

module.exports = createInternalLoadbalancer;
