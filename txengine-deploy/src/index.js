
import * as core from '@actions/core';

import { failIfNotTrunkBased, run } from '../../utils/src/index.js';
import configureDomains from './configure-domains.js';
import deploy from './deploy.js';
import prepareEnvConfig from './env-config.js';
import kubectl from './kubectl.js';
import createManifests from './manifests.js';

const action = async () => {
  const deployServiceAccountKey = core.getInput('deploy-service-account-key', {
    required: true,
  });
  const secretServiceAccountKey = core.getInput('secret-service-account-key', {
    required: true,
  });
  const image = core.getInput('image', { required: true });
  const tenantName = core.getInput('tenant-name', { required: true });
  const countryCode = core.getInput('country-code') || '';
  const inputEnvironment = core.getInput('environment');

  failIfNotTrunkBased();

  const projectId = await kubectl.configure(deployServiceAccountKey);

  const envConfig = await prepareEnvConfig(
    deployServiceAccountKey,
    projectId,
    image,
    tenantName,
    countryCode,
    inputEnvironment,
  );

  const manifest = await createManifests(secretServiceAccountKey, envConfig);
  await deploy(manifest);
  await configureDomains(
    projectId.includes('-staging-') ? 'staging' : 'prod',
    tenantName,
    countryCode,
  );
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
