const core = require('@actions/core');
const fg = require('fast-glob');
const { run } = require('../../utils');
const loadIamDefinition = require('./iam-definition');
const { configureIAM } = require('./configure-iam');
const loadCredentials = require('./load-credentials');
const fetchIamToken = require('../../iam-test-token/src/iam-auth');
const { setupGcloud } = require('../../setup-gcloud');
const projectInfo = require('../../cloud-run/src/project-info');
const getSystemOwners = require('./system-owners');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const setupEnvironment = async (
  serviceAccountKey,
  gcloudAuthKey,
  iam,
  styraUrl,
  iamUrl,
  systemOwners,
) => {
  const projectId = await setupGcloud(gcloudAuthKey);
  const { env: projectEnv } = projectInfo(projectId);

  // Skip IAM handling if staging (not iam-api)
  let skipIAM = (projectEnv === 'staging');
  // By default we always target prod iam-api unless explicitly told not to.
  let credentialsEnv = 'prod';
  let url = iamUrl;
  if (projectEnv === 'staging' && iamUrl.endsWith('retailsvc.dev')) {
    credentialsEnv = 'staging';
    skipIAM = false;
    core.warning(`IAM definitions has been explicitly configured to publish to ${iamUrl} which is the STAGING environment.`);
  } else if (projectEnv === 'prod' && iamUrl.endsWith('retailsvc.dev')) {
    url = iamUrl.replace('dev', 'com');
  }

  const {
    styraToken,
    iamApiEmail,
    iamApiPassword,
    iamApiKey,
    iamApiTenant,
  } = await loadCredentials(serviceAccountKey, credentialsEnv);
  let iamToken = '';
  if (!skipIAM) {
    iamToken = await fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenant);
  }
  return configureIAM(
    iam,
    styraToken,
    styraUrl,
    url,
    iamToken,
    projectEnv,
    projectId,
    systemOwners,
    skipIAM,
  );
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceAccountKeyStaging = core.getInput('service-account-key-staging', { required: true });
  const serviceAccountKeyProd = core.getInput('service-account-key-prod', { required: true });
  const iamFileGlob = core.getInput('iam-definition') || 'iam/*.yaml';
  const iamUrl = core.getInput('iam-api-url') || 'https://iam-api.retailsvc.com';
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.svc.styra.com';
  const dryRun = core.getInput('dry-run') === 'true';
  const skipProd = core.getInput('skip-prod') === 'true';

  const iamFiles = fg.sync(iamFileGlob, { onlyFiles: true });

  const githubToken = await loadSecret(serviceAccountKey, 'github-token');
  const systemOwners = await getSystemOwners(githubToken, serviceAccountKeyStaging);

  for (const iamFile of iamFiles) {
    core.startGroup(`Process ${iamFile}`);
    const iam = loadIamDefinition(iamFile);
    if (!dryRun) {
      // We MUST process these files one by one as we depend on external tools

      core.info('Update staging');
      // eslint-disable-next-line no-await-in-loop
      await setupEnvironment(
        serviceAccountKey,
        serviceAccountKeyStaging,
        iam,
        styraUrl,
        iamUrl,
        systemOwners,
      );

      if (!skipProd) {
        core.info('Update prod');
        // eslint-disable-next-line no-await-in-loop
        await setupEnvironment(
          serviceAccountKey,
          serviceAccountKeyProd,
          iam,
          styraUrl,
          iamUrl,
          systemOwners,
        );
      }
    }
    core.endGroup();
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
