const core = require('@actions/core');
const { run } = require('../../utils/src');
const pushPolicy = require('./push-policy');

const action = async () => {
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.svc.styra.com';
  const styraToken = core.getInput('styra-das-token', { required: true });
  const stagingSystemId = core.getInput('staging-system-id', { required: true });
  const prodSystemId = core.getInput('prod-system-id', { required: true });

  await pushPolicy(styraUrl, styraToken, stagingSystemId, prodSystemId);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
