const kubectl = require('./kubectl');

const deploy = async ({ file, namespace, tenantName }, timeoutSeconds = 180) => {
  // Apply
  await kubectl.exec(['apply', '-f', file]);

  // Roll out
  await kubectl.exec([
    'rollout',
    'status',
    'statefulset',
    `${tenantName}-txengine-service`,
    `--timeout=${timeoutSeconds}s`,
    `--namespace=${namespace}`,
  ]);
};

module.exports = deploy;
