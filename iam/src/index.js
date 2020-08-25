const core = require('@actions/core');
const { run } = require('../../utils');
const loadServiceDefinition = require('./iam-definition');

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const iamFile = core.getInput('iam-definition') || 'iam.yaml';
  const iam = loadServiceDefinition(serviceFile);

};

if (require.main === module) {
  run(action);
}

module.exports = action;
