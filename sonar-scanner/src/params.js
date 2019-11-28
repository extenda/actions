const fs = require('fs');

const createParams = (hostUrl, mainBranch) => {
  const sonarCloud = hostUrl.startsWith('https://sonarcloud.io');
  const params = [];
  params.push(`-Dsonar.host.url=${hostUrl}`);
  params.push(`-Dsonar.login=${process.env.SONAR_TOKEN}`);

  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');
  const repo = process.env.GITHUB_REPOSITORY.split('/');
  const event = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

  params.push(`-Dsonar.projectName=${repo[1]}`);

  if (sonarCloud) {
    params.push(`-Dsonar.organization=${repo[0]}`);
    params.push(`-Dsonar.projectKey=${repo.join('_')}`);
  }

  if (event.pull_request) {
    if (sonarCloud) {
      params.push(`-Dsonar.pullrequest.base=${event.pull_request.base.ref}`);
      params.push(`-Dsonar.pullrequest.branch=${event.pull_request.head.ref}`);
      params.push(`-Dsonar.pullrequest.key=${event.pull_request.number}`);
      params.push('-Dsonar.pullrequest.provider=github');
      params.push(`-Dsonar.pullrequest.github.repository=${process.env.GITHUB_REPOSITORY}`);
    } else {
      // SonarQube 6
      params.push(`-Dsonar.github.oauth=${process.env.GITHUB_TOKEN}`);
      params.push('-Dsonar.analysis.mode=preview');
      params.push(`-Dsonar.github.repository=${process.env.GITHUB_REPOSITORY}`);
      params.push(`-Dsonar.github.pullRequest=${event.pull_request.number}`);
    }
  } else if (sonarCloud && branch !== mainBranch) {
    params.push(`-Dsonar.branch.name=${branch}`);
  }

  return params.join(' ');
};

module.exports = {
  createParams,
};
