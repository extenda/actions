import * as core from '@actions/core';
import axios from 'axios';

import getToken from './identity-token.js';

axios.defaults.baseURL = 'https://platform-api.retailsvc.com';

// The canary status is read before every deploy without traffic.
// A slow platform-api must not hold the deploy up.
const CANARY_STATUS_TIMEOUT_MS = 10000;
// platform-api answers when the traffic change is complete.
const SET_TRAFFIC_TIMEOUT_MS = 60000;

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

const isCanaryRecord = (data) =>
  typeof data?.status === 'string' && typeof data?.revision === 'string';

/**
 * Get the automatic canary of a service.
 * @returns {Promise<object|null>} the canary record, or null if the service has none
 * @throws Error if platform-api gives no usable answer
 */
const getAutomaticCanary = async (service, project, region) => {
  const url = `/canary/automatic/${encodeURIComponent(service)}`;
  const { status, data } = await axios.get(url, {
    params: { project, region },
    headers: {
      Authorization: `Bearer ${await getToken()}`,
    },
    timeout: CANARY_STATUS_TIMEOUT_MS,
    validateStatus: (code) => code === 200 || code === 404,
  });
  // Only an answer in platform-api's own shape tells whether a canary exists.
  // A 404 or a 200 from anything else in front of it does not.
  if (status === 200 && isCanaryRecord(data)) {
    return data;
  }
  if (status === 404 && data?.statusCode === 404) {
    return null;
  }
  throw new Error(`Unexpected answer from platform-api (status ${status})`);
};

/**
 * Set the traffic of a service. This also cancels a canary in progress.
 * @param revisions a list of `{ name, trafficPercent }`
 * @throws Error if the traffic was not set
 */
const setRevisionTraffic = async (service, project, region, revisions) => {
  const url = '/services/revisions';
  const response = await axios.post(url, revisions, {
    params: { project, service, region },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getToken()}`,
    },
    timeout: SET_TRAFFIC_TIMEOUT_MS,
  });
  core.info(`response from ${url} with response code ${response.status}`);
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

const isProjectWhitelisted = async (projectId) => {
  const url = `/security/whitelist/${encodeURIComponent(projectId)}`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${await getToken()}`,
    },
  });
  return response.data.whitelisted === true;
};

export {
  getAutomaticCanary,
  isProjectWhitelisted,
  refreshCanaryStatus,
  registerAutomaticCanary,
  saveVulnerabilities,
  sendDeployInfo,
  sendDeployRequest,
  sendScaleSetup,
  setRevisionTraffic,
};
