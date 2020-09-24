const core = require('@actions/core');
const { run } = require('../../utils');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const getIamToken = require('./iam-auth');

const loadCredentials = async (serviceAccountKey) => {
  const email = await loadSecret(serviceAccountKey, 'iam-testrunner-email');
  const password = await loadSecret(serviceAccountKey, 'iam-testrunner-password-prod');
  const apiKey = await loadSecret(serviceAccountKey, 'iam-api-key-prod');
  const tenant = await loadSecret(serviceAccountKey, 'iam-testrunner-tenant-prod');

  return [
    apiKey,
    email,
    password,
    tenant,
  ];
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const token = await loadCredentials(serviceAccountKey)
    .then((credentials) => getIamToken(...credentials));
  core.setSecret(token);
  core.exportVariable('IAM_TOKEN', token);
  core.setOutput('iam-token', token);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
