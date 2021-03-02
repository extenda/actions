const kubectl = require('./kubectl');

const deploy = async ({ file, namespace }) => {
  // Apply
  await kubectl.exec(['apply', '-f', file]);

  // Roll out
  await kubectl.exec([
    'rollout',
    'status',
    'statefulset',
    'transaction-engine-service',
    '--timeout=180s',
    `--namespace=${namespace}`,
  ]);
};

module.exports = deploy;
