const request = require('request');
const yaml = require('js-yaml');

const getTokenFromOpaConfig = async (url, token) => new Promise((resolve, reject) => {
  request({
    uri: url,
    method: 'GET',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    json: true,
  }, (error, res, body) => {
    if (error) {
      reject(new Error(error));
    } else {
      const configYaml = yaml.loadAll(body)[0].data['conf.yaml'];
      resolve(yaml.load(configYaml).services[0].credentials.bearer.token);
    }
  });
});

const buildOpaConfig = async (systemId, styraToken, namespace, styraUrl) => {
  const getConfigUrl = `${styraUrl}/v1/systems/${systemId}/assets/example-app`;
  const token = await getTokenFromOpaConfig(getConfigUrl, styraToken);
  const opaConfig = {
    kind: 'ConfigMap',
    apiVersion: 'v1',
    metadata: {
      name: 'opa-envoy-config',
      namespace,
    },
    data: {
      'conf.yaml': `services:
  - name: styra
    url: ${styraUrl}/v1
    credentials:
      bearer:
        token: "${token}"
labels:
  system-id: "${systemId}"
  system-type: "envoy"
discovery:
  name: discovery
  prefix: "/systems/${systemId}"\n`,
    },
  };
  return yaml.dump(opaConfig);
};

module.exports = buildOpaConfig;