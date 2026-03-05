import * as core from '@actions/core';

import { failIfNotTrunkBased } from '../../utils/src/index.js';
import jsonSchema from './cloud-run-schema.js';
import configureDomains from './configure-domains.js';
import runDeploy from './run-deploy.js';
import loadServiceDefinition from './service-definition.js';

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key') || '';
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const servicePatch = core.getInput('service-definition-patch');
  const image = core.getInput('image') || '';
  const domainBindingsEnv = core.getInput('domain-mappings-env') || '';
  const dnsProjectLabel = core.getInput('dns-project-label') || 'dns';
  const verbose = core.getInput('verbose') || 'false';

  core.warning('This action is deprecated and has been disabled!');
  core.warning(
    'Please migrate to the new cloud-deploy Action for continued support and new features.',
  );
  process.exit(0);

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

export default action;
