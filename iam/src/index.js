const core = require('@actions/core');
const fg = require('fast-glob');
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

const setupEnvironment = async (serviceAccountKey, gcloudAuthKey, iam, styraUrl, iamUrl) => {
  const projectId = await gcloudAuth(gcloudAuthKey);
  const { env: projectEnv } = projectInfo(projectId);

  let credentialsEnv = projectEnv;
  if (projectEnv === 'staging') {
    // Even for staging, we always target prod iam-api unless explicitly told not to.
    credentialsEnv = iamUrl.endsWith('retailsvc.dev') ? 'staging' : 'prod';
    core.warning(`IAM definitions has been explicitly configured to publish to ${iamUrl} which is the STAGING environment.`);
  }

  const {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  } = await loadCredentials(serviceAccountKey, credentialsEnv);

  const promises = [];

  promises.push(fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenant)
    .then((iamToken) => configureIAM(
      iam, styraToken, styraUrl, iamUrl, iamToken, projectEnv, projectId,
    )));

  return Promise.all(promises);
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceAccountKeyStaging = core.getInput('service-account-key-staging', { required: true });
  const serviceAccountKeyProd = core.getInput('service-account-key-prod', { required: true });

  const iamFileGlob = core.getInput('iam-definition') || 'iam/*.yaml';
  const iamUrl = core.getInput('iam-api-url') || 'https://iam-api.retailsvc.com';
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.styra.com';

  const iamFiles = fg.sync(iamFileGlob, { onlyFiles: true });

  for (const iamFile of iamFiles) {
    const iam = loadIamDefinition(iamFile);
    // We MUST process these files one by one as we depend on external tools
    // eslint-disable-next-line no-await-in-loop
    await setupEnvironment(serviceAccountKey, serviceAccountKeyStaging, iam, styraUrl, iamUrl);
    // eslint-disable-next-line no-await-in-loop
    await setupEnvironment(serviceAccountKey, serviceAccountKeyProd, iam, styraUrl, iamUrl);
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
