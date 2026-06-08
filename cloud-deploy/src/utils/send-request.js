import * as core from '@actions/core';
import axios from 'axios';

import getToken from './identity-token.js';

axios.defaults.baseURL = 'https://platform-api.retailsvc.com';

const sendRequest = async (url, data) => {
  return axios
    .post(url, data, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getToken()}`,
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
};

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

const refreshCanaryStatus = async (data) => {
  const url = `/services/revisions/canary`;
  return sendRequest(url, data);
};

const registerAutomaticCanary = async (data) => {
  const url = '/canary/automatic';
  const result = await sendRequest(url, data);
  if (!result) {
    core.warning(
      'Failed to register automatic canary — deploy succeeded but canary tracking is unavailable',
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

const saveVulnerabilities = async (
  service,
  reportJson,
  labels,
  githubRepository,
) => {
  const url = '/security/vulnerabilities';
  const data = {
    service,
    labels,
    reportJson,
    githubRepository,
  };
  return sendRequest(url, data);
};

export {
  refreshCanaryStatus,
  registerAutomaticCanary,
  saveVulnerabilities,
  sendDeployInfo,
  sendDeployRequest,
  sendScaleSetup,
};
