const fs = require('fs');
const { credentials } = require('./sonar-credentials');

const createParams = async (hostUrl, mainBranch, msParams = false, extraParams = {}) => {
  const sonarCloud = hostUrl.startsWith('https://sonarcloud.io');
  const { githubToken, sonarToken } = await credentials(hostUrl);
  const props = { ...extraParams };
  props['sonar.host.url'] = hostUrl;
  props['sonar.login'] = sonarToken;

  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
  const [owner, repository] = process.env.GITHUB_REPOSITORY.split('/');
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

  if (msParams) {
    props['/n:'] = repository;
  } else {
    props['sonar.projectName'] = repository;
  }

  if (msParams) {
    // Note: For other build tools, we assume legacy sonar project key is
    // provided by Maven/Gradle or sonar props file.
    props['/k:'] = `${owner}_${repository}`;
  }

  if (sonarCloud) {
    if (msParams) {
      // MSBuild uses other prefixes for this variables.
      props['/o:'] = owner;
    } else {
      props['sonar.organization'] = owner;
      props['sonar.projectKey'] = `${owner}_${repository}`;
    }
  }

  if (event.pull_request) {
    if (sonarCloud) {
      props['sonar.pullrequest.base'] = event.pull_request.base.ref;
      props['sonar.pullrequest.branch'] = event.pull_request.head.ref;
      props['sonar.pullrequest.key'] = event.pull_request.number;
      props['sonar.pullrequest.provider'] = 'github';
      props['sonar.pullrequest.github.repository'] = process.env.GITHUB_REPOSITORY;
    } else {
      // SonarQube 6
      props['sonar.github.oauth'] = githubToken;
      props['sonar.analysis.mode'] = 'preview';
      props['sonar.github.repository'] = process.env.GITHUB_REPOSITORY;
      props['sonar.github.pullRequest'] = event.pull_request.number;
    }
  } else if (sonarCloud && branch !== mainBranch) {
    props['sonar.branch.name'] = branch;
  }

  const prefix = msParams ? '/d:' : '-D';

  const params = [];
  Object.keys(props).forEach((name) => {
    const value = msParams ? `"${props[name]}"` : props[name];
    if (name.charAt(0) === prefix.charAt(0)) {
      params.push(`${name}${value}`);
    } else {
      params.push(`${prefix}${name}=${value}`);
    }
  });
  return params.join(' ');
};

module.exports = {
  createParams,
};
