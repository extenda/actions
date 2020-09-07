const core = require('@actions/core');
const { run } = require('../../utils');
const loadIamDefinition = require('./iam-definition');
const configureIAM = require('./configure-iam');

const fetchIamToken = require('./iam-auth');


const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const iamFile = core.getInput('iam-definition') || 'iam.yaml';
  const styraTenant = core.getInput('styra-workspace') || 'extendaretail';
  const iamUrl = core.getInput('iam-api-url') || 'https://iam-api.retailsvc';

  const styraToken = core.getInput('styra-token', { required: true });
  const iamApiEmail = core.getInput('iam-email', { required: true });
  const iamApiPassword = core.getInput('iam-password', { required: true });
  const iamApiKey = core.getInput('iam-key', { required: true });
  const iamApiTenantId = core.getInput('iam-tenant', { required: true });

  const iam = loadIamDefinition(iamFile);
  await fetchIamToken(iamApiKey, iamApiEmail, iamApiPassword, iamApiTenantId)
    .then((iamToken) => configureIAM(
      serviceAccountKey, iam, styraToken, styraTenant, iamUrl, iamToken,
    ));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
