const core = require('@actions/core');
const axios = require('axios');
const {
  securityVersion,
} = require('../../cloud-deploy/src/manifests/security-sidecar');
const {
  imageTag: collectorVersion,
} = require('../../cloud-deploy/src/manifests/collector-sidecar');

const readProperty = (object, propertyName, defaultValue) => {
  if (propertyName in object) {
    return object[propertyName];
  }
  return defaultValue;
};

const copyInfo = (platform, service, data) => {
  data.platform = platform;
  const o = service[platform];
  data.serviceName = o.service;
  data.protocol = o.protocol || 'http';
  data.timeout = o.timeout || 300;
  data.sessionAffinity = readProperty(o, 'session-affinity', false);
  data.internalTraffic = readProperty(o, 'internal-traffic', true);
  data.collectorVersion = o.monitoring
    ? collectorVersion(o.monitoring)
    : 'none';
  const { traffic: { 'static-egress-ip': staticEgress = true } = {} } = o;
  data.staticEgress = staticEgress;
};

const pathMappings = (env) => {
  if ('path-mappings' in env) {
    return env['path-mappings'].map((mapping) => {
      let target;
      if ('service' in mapping) {
        target = `service/${mapping.service}`;
      } else if ('bucket' in mapping) {
        target = `bucket/${mapping.bucket}`;
      }
      return {
        target,
        paths: mapping.paths,
        rewrite: mapping['path-rewrite'],
      };
    });
  }
  return [];
};

const getDeployInfo = async (service, projectId, bearerToken) => {
  const prod = service.environments.production;

  const { security } = service;
  const {
    security: { 'cloud-armor': { 'policy-name': cloudArmorPolicy } = {} } = {},
  } = service;

  const data = {
    projectID: projectId,
    // prod.regions
    region: 'europe-west1',
    migrate: true,
    loggingSampleRate: 0, // Not possible to set in service definition
    domainMappings: prod['domain-mappings'] || [],
    pathMappings: pathMappings(prod),
    cloudArmorPolicy,
    securityVersion: security === 'none' ? 'none' : securityVersion(security),
  };

  if ('cloud-run' in service) {
    copyInfo('cloud-run', service, data);
  } else if ('kubernetes' in service) {
    copyInfo('kubernetes', service, data);
  }

  core.info(`Get deploy info for:\n${JSON.stringify(data, null, 2)}`);

  return axios
    .post('https://platform-api.retailsvc.com/info/deploy', data, {
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
    })
    .then((response) => {
      const data = response.data;
      core.info(`Deploy info returned:\n${JSON.stringify(data, null, 2)}`);
      return data;
    })
    .catch((err) => {
      core.error(`${err.message}:\n${err.response.data}`);
      throw err;
    });
};

module.exports = getDeployInfo;
