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

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const iamFile = core.getInput('iam-definition') || 'iam.yaml';
  const styraTenant = core.getInput('styra-workspace') || 'extendaretail';

  const projectId = await gcloudAuth(serviceAccountKey);

  const {
    env,
  } = projectInfo(projectId);

  const {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenantId,
  } = await loadCredentials(serviceAccountKey, env);

  const iamUrl = core.getInput('iam-api-url')
  || `https://iam-api.retailsvc.${(env === 'staging') ? 'dev' : 'com'}`;

  const iam = loadIamDefinition(iamFile);
  await fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenantId)
    .then((iamToken) => configureIAM(
      iam, styraToken, styraTenant, iamUrl, iamToken, env,
    ));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
