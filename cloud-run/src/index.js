const core = require('@actions/core');
const { run } = require('../../utils');
const loadServiceDefinition = require('./service-definition');
const runDeploy = require('./run-deploy');
const configureDomains = require('./configure-domains');
const jsonSchema = require('./cloud-run-schema');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const serviceFile = core.getInput('service-definition') || 'cloud-run.yaml';
  const image = core.getInput('image', { required: true });
  const domainBindingsEnv = core.getInput('domain-mappings-env') || '';
  const dnsProjectLabel = core.getInput('dns-project-label') || 'dns';
  const verbose = (core.getInput('verbose') || 'false');

  const service = loadServiceDefinition(serviceFile, jsonSchema);
  await runDeploy(serviceAccountKey, service, image, verbose === 'true')
    .then(({ cluster }) => configureDomains(
      service,
      cluster,
      domainBindingsEnv,
      dnsProjectLabel,
      serviceAccountKey,
    ));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
