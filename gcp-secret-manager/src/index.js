const core = require('@actions/core');
const { loadSecrets, parseInputYaml } = require('./secrets');

const run = async () => {
  try {
    const serviceAccountKey = core.getInput('service-account-key', { required: true });
    const secretsInput = core.getInput('secrets', { required: true });
    const secrets = parseInputYaml(secretsInput);
    await loadSecrets(serviceAccountKey, secrets);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
