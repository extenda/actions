const axios = require('axios');
const core = require('@actions/core');

const sendHttp = async (
  url, token, body,
) => axios({
  url,
  method: 'PUT',
  data: body,
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  },
}).catch((err) => {
  throw new Error(`Request to ${url} failed. Reason: ${err.message}`);
});

const upsertDatasource = async (systemID, styraToken, styraUrl) => {
  const url = `${styraUrl}/v1/datasources/systems/${systemID}/consumers`;
  const body = {
    category: 'rest',
    type: 'push',
  };
  return sendHttp(url, styraToken, body);
};

const updateConsumers = async (systemID, styraToken, styraUrl, consumers) => {
  const url = `${styraUrl}/v1/data/systems/${systemID}/consumers`;
  const body = {
    consumers,
  };
  return sendHttp(url, styraToken, body);
};

const handleConsumers = async (
  systemID, styraToken, styraUrl, consumers, systemName,
) => {
  const allowedConsumers = [];
  if (consumers) {
    for (let i = 0; i < consumers.length; i += 1) {
      for (const sa of consumers[i]['service-accounts']) {
        allowedConsumers.push(sa);
      }
    }
  }
  await upsertDatasource(systemID, styraToken, styraUrl);
  await updateConsumers(systemID, styraToken, styraUrl, allowedConsumers);
  core.info(`consumers handled for ${systemName}`);
};

module.exports = handleConsumers;
