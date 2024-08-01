const core = require('@actions/core');
const YAML = require('yaml');
const checkEnv = require('../../utils/src/check-env');
const { setupGcloud, execGcloud } = require('../../setup-gcloud');

let previousAccount;
let projectId;

const getGcloudAccount = async () =>
  execGcloud(['config', 'get', 'account', '--format=json'], 'gcloud', true)
    .then(JSON.parse)
    .then((account) => {
      if (typeof account === 'string' && account.length > 0) {
        return account;
      }
      return null;
    })
    .catch(() => null);

const prepareGcloud = async (serviceAccountKey) => {
  previousAccount = await getGcloudAccount();
  return setupGcloud(serviceAccountKey);
};

const restorePreviousGcloudAccount = async () => {
  if (previousAccount) {
    const current = await getGcloudAccount();
    if (previousAccount !== current) {
      core.info(`Restore gcloud account ${previousAccount}`);
      await execGcloud(
        ['config', 'set', 'account', previousAccount],
        'gcloud',
        true,
      );
    }
  }
  previousAccount = null;
};

const accessSecretValue = async (name) =>
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

const loadSecrets = async (serviceAccountKey, secrets = {}) => {
  projectId = await prepareGcloud(serviceAccountKey);
  try {
    for (const env of Object.keys(secrets)) {
      const name = secrets[env];
      core.info(`Load secret '${name}'`);

      const secret = await accessSecretValue(name);
      core.setSecret(secret);
      core.exportVariable(env, secret);
    }
  } finally {
    await restorePreviousGcloudAccount();
  }
};

const loadSecret = async (serviceAccountKey, name) => {
  projectId = await prepareGcloud(serviceAccountKey);
  const value = await accessSecretValue(name).then((secret) => {
    core.setSecret(secret);
    return secret;
  });
  await restorePreviousGcloudAccount();
  return value;
};

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
