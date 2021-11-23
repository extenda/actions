const exec = require('@actions/exec');
const core = require('@actions/core');
const request = require('request');
const fs = require('fs');
const yaml = require('js-yaml'); // FIXME what YAML lib is used?
const handleConsumers = require('./handle-consumers');

const applyConfiguration = async (opaConfig, fileName) => {
  fs.writeFileSync(fileName, yaml.safeDump(opaConfig));
  return exec.exec('kubectl', [
    'apply',
    '-f',
    fileName,
  ]).then(() => fs.unlinkSync(fileName));
};

const sendInvites = async (
  token, styraUrl, user,
) => new Promise((resolve, reject) => {
  core.info(user);
  const userBody = {
    user_id: user,
    roles: ['viewer'],
  };
  const url = `${styraUrl}/v1/invitations`;
  request({
    uri: url,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: userBody,
    json: true,
  }, (error, res) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(res.statusCode === 200);
    }
  });
});

const setOwners = async (
  systemId, token, styraUrl, systemOwners,
) => new Promise((resolve, reject) => {
  const ownerBody = {
    description: '',
    id: 'owners',
    role_name: 'owner',
    subjects: systemOwners,
  };
  const url = `${styraUrl}/v1/authz/rolebindings/systems/${systemId}/owners`;
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: ownerBody,
    json: true,
  }, (error, res) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(res.statusCode === 400);
    }
  });
});

const updateOwners = async (
  systemId, token, styraUrl, systemOwners,
) => setOwners(systemId, token, styraUrl, systemOwners)
  .then((invites) => {
    if (invites) {
      const invitePromises = [];
      systemOwners.forEach((user) => invitePromises.push(sendInvites(token, styraUrl, user)));
      return Promise.all(invitePromises).then(() => true);
    }
    return false;
  })
  .then((retry) => {
    if (retry) {
      return setOwners(systemId, token, styraUrl, systemOwners);
    }
    return null;
  });

const setLabels = async (
  systemId, env, token, styraUrl,
) => new Promise((resolve, reject) => {
  const labelBody = {
    modules: {
      'labels.rego': `package metadata.${systemId}.labels\n\nlabels = {\n  "system-type": "envoy",\n  "environment": "${env}"\n}\n`,
    },
    signature: {
      signatures: [],
    },
  };
  const url = `${styraUrl}/v1/policies/metadata/${systemId}/labels`;
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: labelBody,
    json: true,
  }, (error) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(true);
    }
  });
});

const setDefaultPolicy = async (
  systemId, token, styraUrl,
) => new Promise((resolve, reject) => {
  const policyBody = {
    modules: {
      'ingress.rego': 'package policy["com.styra.envoy.ingress"].rules.rules\n\nimport data.dataset\n\ndefault allow = true\n',
    },
    signature: {
      signatures: [],
    },
  };
  const url = `${styraUrl}/v1/policies/systems/${systemId}/policy/com.styra.envoy.ingress/rules/rules`;
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: policyBody,
    json: true,
  }, (error) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(true);
    }
  });
});

const setDefaultDataset = async (
  systemId, token, styraUrl,
) => new Promise((resolve, reject) => {
  const datasetBody = {
    jwt: {
      aud: [
        'hiidentity-staff',
        'hiidentity-shoppers',
      ],
      iss: [
        'https://securetoken.google.com/hiidentity-staff',
        'https://securetoken.google.com/hiidentity-shoppers',
      ],
    },
  };
  const url = `${styraUrl}/v1/data/systems/${systemId}/dataset`;
  request({
    uri: url,
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: datasetBody,
    json: true,
  }, (error) => {
    if (error) {
      reject(new Error(error));
    } else {
      resolve(true);
    }
  });
});

const getTokenFromOpaConfig = async (
  url, token,
) => new Promise((resolve, reject) => {
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
      const configYaml = yaml.safeLoadAll(body)[0].data['conf.yaml'];
      resolve(yaml.safeLoad(configYaml).services[0].credentials.bearer.token);
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
  return opaConfig;
};

const createSystem = async (
  namespace, systemName, repo, token, styraUrl, env,
) => new Promise((resolve, reject) => {
  let createSystemBody = {
    name: systemName,
    type: 'envoy',
    read_only: false,
    deployment_parameters: {
      namespace,
    },
    source_control: {
      origin: {
        credentials: 'Extenda-DevOps-Bot',
        path: 'policies',
        reference: 'refs/heads/master',
        url: `https://github.com/extenda/${repo}.git`,
      },
    },
  };
  if (env === 'prod') {
    createSystemBody = {
      name: systemName,
      type: 'envoy',
      read_only: true,
      deployment_parameters: {
        namespace,
      },
    };
  }
  request({
    uri: `${styraUrl}/v1/systems`,
    method: 'POST',
    headers: {
      'Content-type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: createSystemBody,
    json: true,
  }, (error, res, body) => {
    if (!error) {
      resolve(body);
    } else {
      reject(new Error(body));
    }
  });
});

const setupSystem = async (
  service,
  systemName,
  env,
  repo,
  token,
  styraUrl,
  systemOwners,
  consumers,
) => {
  const promises = [];
  const systemResult = await createSystem(service, systemName, repo, token, styraUrl, env);
  if (systemResult.code) {
    core.error(`System creation failed for ${service}. Reason: ${systemResult.code}`);
    core.error(systemResult.message);
    return null;
  }
  const opaConfig = await buildOpaConfig(systemResult.result.id, token, service, styraUrl);
  promises.push(setLabels(systemResult.result.id, env, token, styraUrl));
  promises.push(setDefaultPolicy(systemResult.result.id, token, styraUrl));
  promises.push(setDefaultDataset(systemResult.result.id, token, styraUrl));
  promises.push(updateOwners(systemResult.result.id, token, styraUrl, systemOwners));
  promises.push(applyConfiguration(opaConfig, systemName));
  promises.push(handleConsumers(systemResult.result.id, token, styraUrl, consumers, systemName));

  return Promise.all(promises);
};

module.exports = {
  setupSystem, updateOwners, buildOpaConfig, applyConfiguration,
};
