const axios = require('axios');
const core = require('@actions/core');
const { execGcloud } = require('../../setup-gcloud');
const getDasWorkerBaseUrl = require('./das-worker-base-url');

const getToken = async () =>
  execGcloud(['auth', 'print-identity-token', '--audiences=iam-das-worker']);

const configureBundleSync = async (iam, env) => {
  const { 'permission-prefix': permissionPrefix, services = [] } = iam;
  const token = await getToken();

  for (const system of services) {
    const { name, 'allowed-consumers': consumers } = system;

    const systemId = `${permissionPrefix}.${name}-${env}`;

    core.info(`Upsert system ${systemId}`);

    const dasWorker = axios.create({
      baseURL: getDasWorkerBaseUrl(systemId, token),
      headers: { authorization: `Bearer ${token}` },
    });

    await dasWorker.put(`/systems/${systemId}`);

    if (consumers && consumers.length > 0) {
      core.info(`Update consumers for ${systemId}`);

      await dasWorker.put(`/systems/${systemId}/datasets/consumers`, {
        services: consumers.flatMap(
          ({ 'service-accounts': serviceAccounts }) => serviceAccounts,
        ),
      });
    }
  }
};

module.exports = configureBundleSync;
