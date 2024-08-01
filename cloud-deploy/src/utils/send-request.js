const core = require('@actions/core');
const axios = require('axios');
const getToken = require('./identity-token');

axios.defaults.baseURL = 'https://platform-api.retailsvc.com';

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
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `bearer ${await getToken()}`,
  };
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
  return axios
    .post(url, data, {
      headers,
    })
    .then((response) => {
      const statuscode = response.status;
      core.info(`response from ${url} with response code ${statuscode}`);
    })
    .catch((error) => {
      core.error(`${error}`);
    });
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
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `bearer ${await getToken()}`,
  };
  const data = {
    service,
    timestamp,
    version,
    projectid,
    githubrepository,
    githubsha,
    slackchannel,
  };
  return axios
    .post(url, data, {
      headers,
    })
    .then((response) => {
      const statuscode = response.status;
      core.info(`response from ${url} with response code ${statuscode}`);
    })
    .catch((error) => {
      core.error(`${error}`);
    });
};

module.exports = {
  sendScaleSetup,
  sendDeployInfo,
};
