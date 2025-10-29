const core = require('@actions/core');
const YAML = require('yaml');
const checkEnv = require('../../utils/src/check-env');
const { execGcloud, withGcloud } = require('../../setup-gcloud');

const accessSecretValue = async (projectId, name) =>
  execGcloud(
    [
      'secrets',
      'versions',
      'access',
      'latest',
      `--secret=${name}`,
      `--project=${projectId}`,
      '--format=json',
    ],
    'gcloud',
    true,
  )
    .then(JSON.parse)
    .then((json) => json.payload.data)
    .then((secret) => Buffer.from(secret, 'base64').toString('utf8'));

const parseInputYaml = (secretsYaml) => YAML.parse(secretsYaml);

const loadSecrets = async (serviceAccountKey, secrets = {}) =>
  withGcloud(serviceAccountKey, async (projectId) => {
    for (const env of Object.keys(secrets)) {
      const name = secrets[env];
      core.info(`Load secret '${name}'`);

      const secret = await accessSecretValue(projectId, name);
      core.setSecret(secret);
      core.exportVariable(env, secret);
    }
  });

const loadSecret = async (serviceAccountKey, name) =>
  withGcloud(serviceAccountKey, async (projectId) => {
    const value = await accessSecretValue(projectId, name).then((secret) => {
      core.setSecret(secret);
      return secret;
    });
    return value;
  });

const loadSecretIntoEnv = async (
  serviceAccountKey,
  secretName,
  envVar,
  exportVariable = false,
) => {
  let secret;
  if (process.env[envVar]) {
    core.debug(`Using explicit ${envVar} env var`);
    secret = process.env[envVar];
  } else if (serviceAccountKey && secretName) {
    core.debug(`Load '${secretName}' from secret manager`);
    secret = await loadSecret(serviceAccountKey, secretName);
    process.env[envVar] = secret;
    if (exportVariable) {
      core.exportVariable(envVar, secret);
    }
  } else {
    checkEnv([envVar]);
  }
  return secret;
};

module.exports = {
  loadSecret,
  loadSecretIntoEnv,
  loadSecrets,
  parseInputYaml,
};
