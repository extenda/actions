const core = require('@actions/core');
const fg = require('fast-glob');
const { run } = require('../../utils');
const loadGroupTypeDefinition = require('./grouptype-definition');
const configureGroupTypes = require('./configure-grouptypes');
const loadCredentials = require('../../utils');
const fetchIamToken = require('../../iam-test-token/src/iam-auth');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const projectInfo = require('../../cloud-run/src/project-info');

const gcloudAuth = async (serviceAccountKey) => setupGcloud(
  serviceAccountKey,
  process.env.GCLOUD_INSTALLED_VERSION || 'latest',
);

const setupEnvironment = async (
  serviceAccountKey, gcloudAuthKey, groupTypes, bumUrl,
) => {
  const projectId = await gcloudAuth(gcloudAuthKey);
  const { env: projectEnv } = projectInfo(projectId);

  // Skip BUM handling if staging (not business-unit-api)
  let skipBum = (projectEnv === 'staging');
  // By default we always target prod business-unit-api unless explicitly told not to.
  let credentialsEnv = 'prod';
  let url = bumUrl;
  if (projectEnv === 'staging' && bumUrl.endsWith('retailsvc.dev')) {
    credentialsEnv = 'staging';
    skipBum = false;
    core.warning(`GroupTypes definitions has been explicitly configured to publish to ${bumUrl} which is the STAGING environment.`);
  } else if (projectEnv === 'prod' && bumUrl.endsWith('retailsvc.dev')) {
    url = bumUrl.replace('dev', 'com');
  }

  const {
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  } = await loadCredentials(serviceAccountKey, credentialsEnv);
  let iamToken = '';
  if (!skipBum) {
    iamToken = await fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenant);
  }
  return configureGroupTypes(
    groupTypes, url, iamToken, projectId, skipBum,
  );
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceAccountKeyStaging = core.getInput('service-account-key-staging', { required: true });
  const serviceAccountKeyProd = core.getInput('service-account-key-prod', { required: true });
  const groupTypeFileGlob = core.getInput('group-type-definition') || 'grouptypes/*.yaml';
  const bumUrl = core.getInput('bum-url') || 'https://business-unit-api.retailsvc.com';
  const dryRun = core.getInput('dry-run') === 'true';

  const groupTypeFiles = fg.sync(groupTypeFileGlob, { onlyFiles: true });

  for (const groupTypeFile of groupTypeFiles) {
    core.startGroup(`Process ${groupTypeFile}`);
    const groupTypes = loadGroupTypeDefinition(groupTypeFile);
    if (!dryRun) {
      // We MUST process these files one by one as we depend on external tools

      core.info('Update staging');
      // eslint-disable-next-line no-await-in-loop
      await setupEnvironment(
        serviceAccountKey, serviceAccountKeyStaging, groupTypes, bumUrl,
      );

      core.info('Update prod');
      // eslint-disable-next-line no-await-in-loop
      await setupEnvironment(
        serviceAccountKey, serviceAccountKeyProd, groupTypes, bumUrl,
      );
    }
    core.endGroup();
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
