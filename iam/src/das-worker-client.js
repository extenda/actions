const axios = require('axios');

const createDasWorkerClient = (systemId, token) => {
  // staging IAM systems are updated by staging iam-das-worker
  if (systemId.startsWith('iam.') && systemId.endsWith('-staging')) {
    return axios.create({
      baseURL: 'https://iam-das-worker.retailsvc.dev/api/v1',
      headers: { authorization: `Bearer ${token}` },
    });
  }

  return axios.create({
    baseURL: 'https://iam-das-worker.retailsvc.com/api/v1',
    headers: { authorization: `Bearer ${token}` },
  });
};

module.exports = createDasWorkerClient;
