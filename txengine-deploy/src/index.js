import core from '@actions/core';

import { failIfNotTrunkBased, run } from '../../utils';
import configureDomains from './configure-domains';
import deploy from './deploy';
import prepareEnvConfig from './env-config';
import kubectl from './kubectl';
import createManifests from './manifests';

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

if (require.main === module) {
  run(action);
}

module.exports = action;
