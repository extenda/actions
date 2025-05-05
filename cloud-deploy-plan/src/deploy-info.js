const core = require('@actions/core');
const axios = require('axios');

const copyInfo = (platform, service, data) => {
  data.platform = platform;
  const o = service[platform];
  data.serviceName = o.name;
  data.protocol = o.protocol || 'http';
  data.timeout = o.timeout || 300;
  data.sessionAffinity = o['session-affinity'] || false;
  data.internalTraffic = o['internal-traffic'] || true;
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

  const data = {
    projectID: projectId,
    // prod.regions
    region: 'europe-west1',
    migrate: true,
    loggingSampleRate: 0, // Not possible to set in service definition
    domainMappings: prod['domain-mappings'] || [],
    pathMappings: pathMappings(prod),
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
