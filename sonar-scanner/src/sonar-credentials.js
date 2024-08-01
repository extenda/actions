const core = require('@actions/core');
const { loadSecretIntoEnv } = require('../../gcp-secret-manager/src/secrets');

const defaultSonarToken = (hostUrl) =>
  hostUrl.startsWith('https://sonarcloud.io')
    ? 'sonarcloud-token'
    : 'sonarqube-token';

let credentialsCache;

const loadCredentials = async (hostUrl) => {
  const serviceAccountKey = core.getInput('service-account-key');
  const githubTokenName = core.getInput('github-token-secret-name', {
    required: true,
  });
  const sonarTokenName =
    core.getInput('sonar-token-secret-name') || defaultSonarToken(hostUrl);

  const githubToken = await loadSecretIntoEnv(
    serviceAccountKey,
    githubTokenName,
    'GITHUB_TOKEN',
  );
  const sonarToken = await loadSecretIntoEnv(
    serviceAccountKey,
    sonarTokenName,
    'SONAR_TOKEN',
  );

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

const sonarAuth = async (hostUrl) =>
  credentials(hostUrl).then(({ sonarToken }) => ({
    username: sonarToken,
    password: '',
  }));

module.exports = {
  credentials,
  sonarAuth,
};
