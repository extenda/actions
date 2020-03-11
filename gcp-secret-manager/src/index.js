const core = require('@actions/core');
const { run } = require('../../utils');
const { loadSecrets, parseInputYaml } = require('./secrets');

run(async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const secretsInput = core.getInput('secrets', { required: true });
  const secrets = parseInputYaml(secretsInput);

  await loadSecrets(serviceAccountKey, secrets);
});
