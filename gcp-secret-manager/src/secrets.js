const core = require('@actions/core');
const YAML = require('yaml');
const fs = require('fs');
const tmp = require('tmp');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

tmp.setGracefulCleanup();

let client;

const createKeyFile = (serviceAccountKey) => {
  const tmpFile = tmp.fileSync({ postfix: '.json' });
  const jsonKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
  fs.writeFileSync(tmpFile.name, jsonKey);
  return tmpFile.name;
};

const createClient = (serviceAccountKey) => {
  const keyFilename = createKeyFile(serviceAccountKey);
  client = new SecretManagerServiceClient({
    keyFilename,
  });
};

const accessSecretValue = async (projectId, name) => {
  const [version] = await client.accessSecretVersion({
    name: client.secretVersionPath(projectId, name, 'latest'),
  });
  return version.payload.data.toString('utf8');
};

const parseInputYaml = (secretsYaml) => YAML.parse(secretsYaml);

const loadSecrets = async (serviceAccountKey, secrets = {}) => {
  createClient(serviceAccountKey);
  const projectId = await client.auth.getProjectId();
  const results = [];
  Object.keys(secrets).forEach((env) => {
    const name = secrets[env];
    results.push(accessSecretValue(projectId, name)
      .then((secret) => {
        core.setSecret(secret);
        core.exportVariable(env, secret);
      }));
  });
  return Promise.all(results);
};

const loadSecret = async (serviceAccountKey, name) => {
  createClient(serviceAccountKey);
  const projectId = await client.auth.getProjectId();
  return accessSecretValue(projectId, name)
    .then((secret) => {
      core.setSecret(secret);
      return secret;
    });
};

module.exports = {
  loadSecret,
  loadSecrets,
  parseInputYaml,
};
