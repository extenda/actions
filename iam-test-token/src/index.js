const core = require('@actions/core');
const { run } = require('../../utils');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const getIamToken = require('./iam-auth');

const loadCredentials = async (serviceAccountKey, emailInput, passwordSecret, apiKey, tenant) => {
  let email = emailInput;
  if (!emailInput.includes('@')) {
    email = await loadSecret(serviceAccountKey, emailInput);
  }
  const password = await loadSecret(serviceAccountKey, passwordSecret);

  return [
    apiKey,
    email,
    password,
    tenant,
  ];
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const email = core.getInput('user-email') || 'iam-test-token-email';
  const password = core.getInput('user-password') || 'iam-test-token-password';
  const apiKey = core.getInput('api-key') || 'AIzaSyBn2akUn5Iq9wLfVwPUsHiTtSP7EV2k-FU';
  const tenantId = core.getInput('tenant-id') || 'testrunner-2mfuk';

  const token = await loadCredentials(serviceAccountKey, email, password, apiKey, tenantId)
    .then((credentials) => getIamToken(...credentials));
  core.setSecret(token);
  core.exportVariable('IAM_TOKEN', token);
  core.setOutput('iam-token', token);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
