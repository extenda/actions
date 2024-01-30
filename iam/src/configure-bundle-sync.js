const core = require('@actions/core');
const { execGcloud } = require('../../setup-gcloud');
const createDasWorkerClient = require('./das-worker-client');

const getToken = async () => execGcloud(['auth', 'print-identity-token', '--audiences=iam-das-worker']);

const configureBundleSync = async (iam, env) => {
  const { 'permission-prefix': permissionPrefix, services = [] } = iam;
  const token = await getToken();

  for (const system of services) {
    const { name, 'allowed-consumers': consumers } = system;

    const systemId = `${permissionPrefix}.${name}-${env}`;

    core.info(`Upsert system ${systemId}`);

    const dasWorker = createDasWorkerClient(systemId, token);

    // eslint-disable-next-line no-await-in-loop
    await dasWorker.put(`/systems/${systemId}`);

    if (consumers && consumers.length > 0) {
      core.info(`Update consumers for ${systemId}`);
      // eslint-disable-next-line no-await-in-loop
      await dasWorker.put(`/systems/${systemId}/datasets/consumers`, {
        services: consumers.flatMap(
          ({ 'service-accounts': serviceAccounts }) => serviceAccounts,
        ),
      });
    }
  }
};

module.exports = configureBundleSync;
