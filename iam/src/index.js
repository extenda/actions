const core = require('@actions/core');
const { run } = require('../../utils');
const loadIamDefinition = require('./iam-definition');
const configureIAM = require('./configure-iam');
const loadCredentials = require('./load-credentials');
const fetchIamToken = require('./iam-auth');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const projectInfo = require('../../cloud-run/src/project-info');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const setupEnvironment = async (SA, SACluster, iam, styraUrl) => {
  const projectId = await gcloudAuth(SACluster);
  const {
    env,
  } = projectInfo(projectId);
  const iamUrl = core.getInput('iam-api-url')
    || `https://iam-api.retailsvc.${(env === 'staging') ? 'dev' : 'com'}`;
  const {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  } = await loadCredentials(SA, env);

  const promises = [];

  promises.push(fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenant)
    .then((iamToken) => configureIAM(
      iam, styraToken, styraUrl, iamUrl, iamToken, env, projectId,
    )));

  return Promise.all(promises);
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceAccountKeyStaging = core.getInput('service-account-key-staging', { required: true });
  const serviceAccountKeyProd = core.getInput('service-account-key-prod', { required: true });

  const iamFile = core.getInput('iam-definition') || 'iam.yaml';
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.styra.com';
  const iam = loadIamDefinition(iamFile);

  await setupEnvironment(serviceAccountKey, serviceAccountKeyStaging, iam, styraUrl)
    .then(setupEnvironment(serviceAccountKey, serviceAccountKeyProd, iam, styraUrl));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
