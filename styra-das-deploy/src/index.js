const core = require('@actions/core');
const { run } = require('../../utils/src');
const pushPolicy = require('./push-policy');
const fetchSystemId = require('./fetch-system-id');

const action = async () => {
  const styraUrl = core.getInput('styra-url') || 'https://extendaretail.svc.styra.com';
  const styraToken = core.getInput('styra-das-token', { required: true });
  const permissionPrefix = core.getInput('permission-prefix', { required: true });
  const serviceName = core.getInput('service-name', { required: true });

  const styraStagingId = await fetchSystemId(styraUrl, styraToken, `${permissionPrefix}.${serviceName}-staging`);
  const styraProdId = await fetchSystemId(styraUrl, styraToken, `${permissionPrefix}.${serviceName}-prod`);
  await pushPolicy(
    styraUrl,
    styraToken,
    styraStagingId,
    styraProdId,
    'ingress',
  );
  await pushPolicy(
    styraUrl,
    styraToken,
    styraStagingId,
    styraProdId,
    'app',
  );
};

if (require.main === module) {
  run(action);
}

module.exports = action;
