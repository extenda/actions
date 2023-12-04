const core = require('@actions/core');
const YAML = require('yaml');
const checkEnv = require('../../utils/src/check-env');
const { setupGcloud , execGcloud } = require('../../setup-gcloud');

let projectId;

const restorePreviousGcloudAccount = async () => {
  if (projectId != null) {
    const accounts = await execGcloud(['auth', 'list', '--format=json']).then(JSON.parse);
    if (accounts.length > 1) {
      const previous = accounts.find((a) => !a.account.includes(projectId) && a.status !== 'ACTIVE');
      if (previous) {
        const { account } = previous;
        core.info(`Restore gcloud account ${account}`);
        await execGcloud(['config', 'set', 'account', account]);
      }
    }
    projectId = null;
  }
};

const accessSecretValue = async (name) => execGcloud([
  'secrets',
  'versions',
  'access',
  'latest',
  `--secret=${name}`,
  `--project=${projectId}`,
]);

const parseInputYaml = (secretsYaml) => YAML.parse(secretsYaml);

const loadSecrets = async (serviceAccountKey, secrets = {}) => {
  projectId = await setupGcloud(serviceAccountKey);

  const results = [];
  Object.keys(secrets).forEach((env) => {
    const name = secrets[env];
    results.push(accessSecretValue(name)
      .then((secret) => {
        core.setSecret(secret);
        core.exportVariable(env, secret);
      }));
  });
  return Promise.all(results).finally(() => restorePreviousGcloudAccount());
};

const loadSecret = async (serviceAccountKey, name, restoreAccount = true) => {
  if (!projectId) {
    projectId = await setupGcloud(serviceAccountKey);
  }
  const value = accessSecretValue(name)
    .then((secret) => {
      core.setSecret(secret);
      return secret;
    });

  if (restoreAccount) {
    await restorePreviousGcloudAccount();
  }

  return value;
};

const loadSecretIntoEnv = async (serviceAccountKey, secretName, envVar, exportVariable = false) => {
  let secret;
  if (process.env[envVar]) {
    core.debug(`Using explicit ${envVar} env var`);
    secret = process.env[envVar];
  } else if (serviceAccountKey && secretName) {
    core.debug(`Load '${secretName}' from secret manager`);
    secret = await loadSecret(serviceAccountKey, secretName, false);
    process.env[envVar] = secret;
    if (exportVariable) {
      core.exportVariable(envVar, secret);
    }
  } else {
    checkEnv([envVar]);
  }
  await restorePreviousGcloudAccount();
  return secret;
};

module.exports = {
  loadSecret,
  loadSecretIntoEnv,
  loadSecrets,
  parseInputYaml,
};
