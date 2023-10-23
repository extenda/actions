const core = require('@actions/core');
const axios = require('axios');
const { execGcloud } = require('../../setup-gcloud');

const baseUrl = 'https://iam-das-worker.retailsvc.com/api/v1';

const getToken = async () => execGcloud([
  'auth',
  'print-identity-token',
  '--audiences=iam-das-worker',
]);

const configureBundleSync = async (iam, env) => {
  const {
    'permission-prefix': permissionPrefix,
    name,
    services = [],
  } = iam;

  const systemId = `${permissionPrefix}.${name}-${env}`;

  const config = {
    headers: {
      authorization: `Bearer ${await getToken()}`,
    },
  };

  core.info(`Upsert system ${systemId}`);
  await axios.put(
    `${baseUrl}/systems/${systemId}`,
    null,
    config,
  );

  const consumers = services.filter((s) => 'allowed-consumers' in s)
    .flatMap((s) => s['allowed-consumers'])
    .flatMap((c) => c['service-accounts']);

  core.info(`Update consumers for ${systemId}`);
  await axios.put(
    `${baseUrl}/systems/${systemId}/datasets/consumers`,
    {
      services: consumers,
    },
    config,
  );
};

module.exports = configureBundleSync;
