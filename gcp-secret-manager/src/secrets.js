const core = require('@actions/core');
const YAML = require('yaml');
const fs = require('fs');
const tmp = require('tmp');
const { GoogleAuth } = require('google-auth-library');

tmp.setGracefulCleanup();

let client;

const createKeyFile = (serviceAccountKey) => {
  const tmpFile = tmp.fileSync({ postfix: '.json' });
  const jsonKey = Buffer.from(serviceAccountKey, 'base64').toString('utf8');
  fs.writeFileSync(tmpFile.name, jsonKey);
  return tmpFile.name;
};

const createClient = async (serviceAccountKey) => {
  if (!client) {
    const keyFilename = createKeyFile(serviceAccountKey);
    const auth = new GoogleAuth({
      keyFilename,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    client = await auth.getClient();
  }
};

const accessSecretValue = async (name) => client.request({
  url: `https://secretmanager.googleapis.com/v1/projects/${client.projectId}/secrets/${name}/versions/latest:access`,
}).then((res) => res.data.payload.data)
  .then((secret) => Buffer.from(secret, 'base64').toString('utf8'));

const parseInputYaml = (secretsYaml) => YAML.parse(secretsYaml);

const loadSecrets = async (serviceAccountKey, secrets = {}) => {
  await createClient(serviceAccountKey);
  const results = [];
  Object.keys(secrets).forEach((env) => {
    const name = secrets[env];
    results.push(accessSecretValue(name)
      .then((secret) => {
        core.setSecret(secret);
        core.exportVariable(env, secret);
      }));
  });
  return Promise.all(results);
};

const loadSecret = async (serviceAccountKey, name) => {
  await createClient(serviceAccountKey);
  return accessSecretValue(name)
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
