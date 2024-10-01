const core = require('@actions/core');
const axios = require('axios');
const getToken = require('./identity-token');

axios.defaults.baseURL = 'https://platform-api.retailsvc.com';

const sendRequest = async (url, data) =>
  axios
    .post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `bearer ${await getToken()}`,
      },
    })
    .then((response) => {
      const statuscode = response.status;
      core.info(`response from ${url} with response code ${statuscode}`);
      return true;
    })
    .catch((error) => {
      core.error(`${error}`);
      return false;
    });

const sendDeployRequest = async (data) => {
  const url = '/loadbalancer/deploy';
  const result = await sendRequest(url, data);
  if (!result) {
    throw new Error(
      'Deployment rolled out successfully! loadbalancer setup failed!',
    );
  }
  return result;
};

const sendScaleSetup = async (
  service,
  projectid,
  region,
  platform,
  mininstances,
  scaleup,
  scaledown,
) => {
  const url = '/scaling/setup';
  const data = {
    service,
    projectid,
    region,
    platform,
    mininstances,
    scaleup,
    scaledown,
    scaled: true,
  };
  return sendRequest(url, data);
};

const sendDeployInfo = async (
  service,
  timestamp,
  version,
  projectid,
  githubrepository,
  githubsha,
  slackchannel,
) => {
  const url = '/deployinfo/add';
  const data = {
    service,
    timestamp,
    version,
    projectid,
    githubrepository,
    githubsha,
    slackchannel,
  };
  return sendRequest(url, data);
};

const sendVulnerabilityCount = async (service, critical) => {
  const url = '/security/vulnerability/counter';
  const data = {
    service,
    critical,
  };
  return sendRequest(url, data);
};

module.exports = {
  sendScaleSetup,
  sendDeployInfo,
  sendDeployRequest,
  sendVulnerabilityCount,
};
