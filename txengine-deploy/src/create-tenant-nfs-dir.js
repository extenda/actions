const core = require('@actions/core');
const gcloudOutput = require('./gcloud-output');

const getNFSPodName = async () => gcloudOutput([
  'get',
  'pod',
  '--namespace=txengine-nfs-server',
  '-o=json',
], 'kubectl');

const createTenantDir = async (nfsPodName, tenantName) => gcloudOutput([
  'exec',
  '--namespace=txengine-nfs-server',
  nfsPodName,
  '--',
  'mkdir',
  `/exports/${tenantName}`,
], 'kubectl').catch(() => core.info('Tenant directory already setup for nfs server!'));

const handleNFSServer = async (tenantName) => {
  const nfsPodName = JSON.parse(await getNFSPodName()).items[0].metadata.name;
  return createTenantDir(nfsPodName, tenantName);
};

module.exports = handleNFSServer;
