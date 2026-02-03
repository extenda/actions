import core from '@actions/core';

import { failIfNotTrunkBased, run } from '../../utils';
import jsonSchema from './cloud-run-schema';
import configureDomains from './configure-domains';
import runDeploy from './run-deploy';
import loadServiceDefinition from './service-definition';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const servicePatch = core.getInput('service-definition-patch');
  const image = core.getInput('image', { required: true });
  const domainBindingsEnv = core.getInput('domain-mappings-env') || '';
  const dnsProjectLabel = core.getInput('dns-project-label') || 'dns';
  const verbose = core.getInput('verbose') || 'false';

  failIfNotTrunkBased();

  const service = loadServiceDefinition(serviceFile, jsonSchema, servicePatch);
  await runDeploy(serviceAccountKey, service, image, verbose === 'true').then(
    ({ cluster }) =>
      configureDomains(
        service,
        cluster,
        domainBindingsEnv,
        dnsProjectLabel,
        serviceAccountKey,
      ),
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
