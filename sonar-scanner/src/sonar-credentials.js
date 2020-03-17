const core = require('@actions/core');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');
const { checkEnv } = require('../../utils');

const defaultSonarToken = (isSonarQube) => (
  isSonarQube ? 'sonarcloud-token' : 'sonarqube-token'
);

let credentialsCache;

const getSecret = async (serviceAccountKey, secretName, envVar) => {
  let secret;
  if (process.env[envVar]) {
    core.debug(`Using explicit ${envVar} env var`);
    secret = process.env[envVar];
  } else if (serviceAccountKey) {
    core.debug(`Load '${secretName}' from secret manager`);
    secret = await loadSecret(serviceAccountKey, secretName);
    process.env[envVar] = secret;
  } else {
    checkEnv([envVar]);
  }
  return secret;
};

const loadCredentials = async (isSonarQube) => {
  const serviceAccountKey = core.getInput('service-account-key');
  const githubTokenName = core.getInput('github-token-secret-name');
  const sonarTokenName = core.getInput('sonar-token-secret-name') || defaultSonarToken(isSonarQube);

  const githubToken = await getSecret(serviceAccountKey, githubTokenName, 'GITHUB_TOKEN');
  const sonarToken = await getSecret(serviceAccountKey, sonarTokenName, 'SONAR_TOKEN');

  return {
    githubToken,
    sonarToken,
  };
};

const credentials = async (hostUrl, cache = true) => {
  if (!credentialsCache || !cache) {
    credentialsCache = await loadCredentials(hostUrl);
  }
  return credentialsCache;
};

const sonarAuth = async (hostUrl) => credentials(hostUrl)
  .then(({ sonarToken }) => ({
    username: sonarToken,
    password: '',
  }));

module.exports = {
  credentials,
  sonarAuth,
};
