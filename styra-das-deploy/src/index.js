const core = require('@actions/core');
const { run } = require('../../utils/src');
const pushPolicy = require('./push-policy');

const action = async () => {
  const styraTenant = core.getInput('styra-workspace') || 'extendaretail';
  const styraToken = core.getInput('styra-das-token', { required: true });
  const stagingSystemId = core.getInput('staging-system-id', { required: true });
  const prodSystemId = core.getInput('prod-system-id', { required: true });

  await pushPolicy(styraTenant, styraToken, stagingSystemId, prodSystemId);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
