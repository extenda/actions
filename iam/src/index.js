const core = require('@actions/core');
const { run } = require('../../utils');
const loadIamDefinition = require('./iam-definition');
const configureIAM = require('./configure-iam');


const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const iamFile = core.getInput('iam-definition') || 'iam.yaml';
  const iam = loadIamDefinition(iamFile);
  const styra_token = core.getInput('DAS_TOKEN');

  await configureIAM(serviceAccountKey, iam, styra_token);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
