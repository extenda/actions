const core = require('@actions/core');
const { run } = require('../../utils/src');
const pushPolicy = require('./push-policy');
const fetchSystemId = require('./fetch-system-id');

const action = async () => {
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.styra.com';
  const styraToken = core.getInput('styra-das-token', { required: true });
  const permissionPrefix = core.getInput('permission-prefix', { required: true });
  const namespace = core.getInput('namepsace', { required: true });

  const styraStagingId = await fetchSystemId(styraUrl, styraToken, `${permissionPrefix}.${namespace}-staging`);
  const styraProdId = await fetchSystemId(styraUrl, styraToken, `${permissionPrefix}.${namespace}-prod`);
  await pushPolicy(
    styraUrl,
    styraToken,
    styraStagingId,
    styraProdId,
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
