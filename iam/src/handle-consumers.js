const axios = require('axios');
const core = require('@actions/core');
const { iamApiErrorToString } = require('./utils/iam-api-error-to-string');

const uploadMapping = async (systemId, systemName, iamToken, iamUrl) => axios({
  url: `${iamUrl}/api/internal/styra-systems/${systemName}`,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${iamToken}`,
  },
  data: {
    styraSystemId: systemId,
  },
}).then(() => {
  const message = `styra system mapping '${systemName}' added`;
  core.info(message);
  return message;
}).catch((err) => {
  throw new Error(iamApiErrorToString(err, `Could not add mapping for '${systemName}'`));
});

const sendHttp = async (url, token, body) => axios({
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

const sendHttpWithRetries = async (url, token, body, attempts, backoffSeconds) => {
  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < attempts; i += 1) {
    let error;
    await sendHttp(url, token, body).catch((err) => {
      error = err;
    });
    if (error) {
      if (i === attempts - 1) {
        throw new Error(error.message);
      }
      await new Promise((r) => {
        setTimeout(r, (backoffSeconds * 1000));
      });
    } else {
      break;
    }
  }
  /* eslint-enable no-await-in-loop */
  return null;
};

const upsertDatasource = async (systemID, styraToken, styraUrl, retries, backoffSeconds) => {
  const url = `${styraUrl}/v1/datasources/systems/${systemID}/consumers`;
  const body = {
    category: 'rest',
    type: 'push',
  };
  return sendHttpWithRetries(url, styraToken, body, retries, backoffSeconds);
};

const updateConsumers = async (
  systemID,
  styraToken,
  styraUrl,
  services,
  retries,
  backoffSeconds,
) => {
  const url = `${styraUrl}/v1/data/systems/${systemID}/consumers`;
  const body = {
    services,
  };
  return sendHttpWithRetries(url, styraToken, body, retries, backoffSeconds);
};

const handleConsumers = async (
  systemID,
  styraToken,
  styraUrl,
  consumers,
  systemName,
  iamToken,
  iamUrl,
  retries = 3,
  backoffSeconds = 1,
) => {
  const allowedConsumers = [];
  if (consumers) {
    for (let i = 0; i < consumers.length; i += 1) {
      for (const sa of consumers[i]['service-accounts']) {
        allowedConsumers.push(sa);
      }
    }
  }
  await upsertDatasource(systemID, styraToken, styraUrl, retries, backoffSeconds);
  await updateConsumers(systemID, styraToken, styraUrl, allowedConsumers, retries, backoffSeconds);
  await uploadMapping(systemID, systemName, iamToken, iamUrl);

  core.info(`consumers handled for ${systemName}`);
};

module.exports = handleConsumers;
