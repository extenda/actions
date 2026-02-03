import * as core from '@actions/core';
import fg from 'fast-glob';

import projectInfo from '../../cloud-run/src/project-info.js';
import fetchIamToken from '../../iam-test-token/src/iam-auth.js';
import { setupGcloud } from '../../setup-gcloud';
import configureBundleSync from './configure-bundle-sync.js';
import { configureIAM } from './configure-iam.js';
import loadIamDefinition from './iam-definition.js';
import loadCredentials from './load-credentials.js';

const setupEnvironment = async (
  serviceAccountKey,
  gcloudAuthKey,
  iam,
  styraUrl,
  iamUrl,
) => {
  const projectId = await setupGcloud(gcloudAuthKey);
  const { env: projectEnv } = projectInfo(projectId);

  // Skip IAM handling if staging (not iam-api)
  let skipIAM = projectEnv === 'staging';
  // By default we always target prod iam-api unless explicitly told not to.
  let credentialsEnv = 'prod';
  let url = iamUrl;
  if (projectEnv === 'staging' && iamUrl.endsWith('retailsvc.dev')) {
    credentialsEnv = 'staging';
    skipIAM = false;
    core.warning(
      `IAM definitions has been explicitly configured to publish to ${iamUrl} which is the STAGING environment.`,
    );
  } else if (projectEnv === 'prod' && iamUrl.endsWith('retailsvc.dev')) {
    url = iamUrl.replace('dev', 'com');
  }

  const { iamApiEmail, iamApiPassword, iamApiKey, iamApiTenant } =
    await loadCredentials(serviceAccountKey, credentialsEnv);
  let iamToken = '';
  if (!skipIAM) {
    iamToken = await fetchIamToken(
      iamApiKey,
      iamApiEmail,
      iamApiPassword,
      iamApiTenant,
    );
  }

  await configureBundleSync(iam, projectEnv);

  return configureIAM(iam, url, iamToken, skipIAM);
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const serviceAccountKeyStaging = core.getInput(
    'service-account-key-staging',
    { required: true },
  );
  const serviceAccountKeyProd = core.getInput('service-account-key-prod', {
    required: true,
  });
  const iamFileGlob = core.getInput('iam-definition') || 'iam/*.yaml';
  const iamUrl =
    core.getInput('iam-api-url') || 'https://iam-api.retailsvc.com';
  const styraUrl =
    core.getInput('styra-url') || 'https://extendaretail.svc.styra.com';
  const dryRun = core.getInput('dry-run') === 'true';
  const skipProd = core.getInput('skip-prod') === 'true';

  const iamFiles = fg.sync(iamFileGlob, { onlyFiles: true });

  for (const iamFile of iamFiles) {
    core.startGroup(`Process ${iamFile}`);
    const iam = loadIamDefinition(iamFile);
    if (!dryRun) {
      // We MUST process these files one by one as we depend on external tools

      core.info('Update staging');

      await setupEnvironment(
        serviceAccountKey,
        serviceAccountKeyStaging,
        iam,
        styraUrl,
        iamUrl,
      );

      if (!skipProd) {
        core.info('Update prod');

        await setupEnvironment(
          serviceAccountKey,
          serviceAccountKeyProd,
          iam,
          styraUrl,
          iamUrl,
        );
      }
    }
    core.endGroup();
  }
};

// Entry point check removed for ESM compatibility

export default action;
