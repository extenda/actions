const handleNFSServer = require('./create-tenant-nfs-dir');
const kubectl = require('./kubectl');

const deploy = async ({ file, namespace, tenantName }, timeoutSeconds) => {
  // Setup tenant directory on nfs
  await handleNFSServer(tenantName);

  // Apply
  await kubectl.exec(['apply', '-f', file]);

  // Roll out
  return kubectl.exec([
    'rollout',
    'status',
    'statefulset',
    `${tenantName}-txengine-service`,
    `--timeout=${timeoutSeconds}s`,
    `--namespace=${namespace}`,
  ]);
};

module.exports = deploy;
