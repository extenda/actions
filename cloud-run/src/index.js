import { fileURLToPath } from 'node:url';
import * as core from '@actions/core';

import { failIfNotTrunkBased, run } from '../../utils/src/index.js';
import jsonSchema from './cloud-run-schema.js';
import configureDomains from './configure-domains.js';
import runDeploy from './run-deploy.js';
import loadServiceDefinition from './service-definition.js';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
