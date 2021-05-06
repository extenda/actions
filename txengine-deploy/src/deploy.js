const kubectl = require('./kubectl');

const deploy = async ({ file, namespace, tenantName }, timeoutSeconds) => {
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

  return checkStatus(namespace);

};

module.exports = deploy;
