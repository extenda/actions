const core = require('@actions/core');
const YAML = require('yaml');
const { GoogleAuth } = require('google-auth-library');
const createKeyFile = require('../../utils/src/create-key-file');

let client;

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
