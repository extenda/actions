const core = require('@actions/core');
const gcloudOutput = require('../../utils/gcloud-output');
const { projectWithoutNumbers } = require('../../utils/clan-project-name');

const create404Bucket = async (projectID, env) => {
  return gcloudOutput([
    'mb',
    '-c',
    'standard',
    '-l',
    'europe-west1',
    '-p',
    projectID,
    '-b',
    'on',
    `gs://${projectWithoutNumbers(projectID, env)}-404`,
  ], 'gsutil')
    .then(() => {
      return gcloudOutput([
        'compute',
        'backend-buckets',
        'create',
        `${projectWithoutNumbers(projectID, env)}-404`,
        `--gcs-bucket-name=${projectWithoutNumbers(projectID, env)}-404`,
        `--project=${projectID}`,
      ])
    });
};

const createLoadbalancer = async (projectID, env) => await gcloudOutput([
  'compute',
  'url-maps',
  'create',
  `${projectWithoutNumbers(projectID, env)}-lb-external`,
  `--project=${projectID}`,
  `--default-backend-bucket=${projectWithoutNumbers(projectID, env)}-404`,
]);


// Create healthcheck if not exists
const setupHealthCheck = async (projectID) => gcloudOutput([
  'compute',
  'health-checks',
  'create',
  'tcp',
  `${projectID}-external-hc`,
  '--global',
  '--use-serving-port',
  '--check-interval=10s',
  `--project=${projectID}`,
]);

const createExternalLoadbalancer = async (projectID, env) => {
  // TODO: check if loadbalancer exists and return

  await create404Bucket(projectID, env);
  await createLoadbalancer(projectID, env);
  await setupHealthCheck(projectID);
};

module.exports = createExternalLoadbalancer;
