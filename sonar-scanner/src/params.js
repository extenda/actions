import path from 'node:path';

import { getPullRequestInfo } from '../../utils/src/pull-request-info.js';
import { credentials } from './sonar-credentials.js';

export const createParams = async (
  hostUrl,
  mainBranch,
  workingDir = '.',
  msParams = false,
  extraParams = {},
) => {
  const sonarCloud = hostUrl.startsWith('https://sonarcloud.io');
  const { githubToken, sonarToken } = await credentials(hostUrl);
  const props = { ...extraParams };
  props['sonar.host.url'] = hostUrl;
  if (sonarCloud) {
    props['sonar.token'] = sonarToken;
  } else {
    props['sonar.login'] = sonarToken;
  }

  const branch = process.env.GITHUB_REF.replace('refs/heads/', '');

  const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
  const pullRequest = await getPullRequestInfo(githubToken);
  let projectKey = repo;
  let projectName = `${repo}`;
  // SonarCloud organizations are lowercase only
  const sonarOrg = owner.toLowerCase();

  const suffix = path.basename(workingDir).replace(/^\.\/?/g, '') || '';
  if (suffix) {
    projectName = `${repo} | ${suffix}`;
    projectKey = `${repo}_${suffix}`;
  }
  projectName = `"${projectName}"`;

  if (process.env.SONAR_VERBOSE === 'true') {
    props['sonar.verbose'] = 'true';
  }

  if (msParams) {
    props['/n:'] = projectName;
  } else {
    props['sonar.projectName'] = projectName;
  }

  if (msParams) {
    // Note: For other build tools, we assume legacy sonar project key is
    // provided by Maven/Gradle or sonar props file.
    props['/k:'] = `${owner}_${projectKey}`;
  }

  if (sonarCloud) {
    if (msParams) {
      // MSBuild uses other prefixes for these variables.
      props['/o:'] = sonarOrg;
    } else {
      props['sonar.organization'] = sonarOrg;
      props['sonar.projectKey'] = `${owner}_${projectKey}`;
    }
  }

  if (pullRequest) {
    if (sonarCloud) {
      props['sonar.pullrequest.base'] = pullRequest.base.ref;
      props['sonar.pullrequest.branch'] = pullRequest.head.ref;
      props['sonar.pullrequest.key'] = pullRequest.number;
      props['sonar.pullrequest.provider'] = 'github';
      props['sonar.pullrequest.github.repository'] =
        process.env.GITHUB_REPOSITORY;
    } else if (hostUrl === 'https://sonar.extenda.io') {
      // SonarQube 6
      props['sonar.github.oauth'] = githubToken;
      props['sonar.analysis.mode'] = 'preview';
      props['sonar.github.repository'] = process.env.GITHUB_REPOSITORY;
      props['sonar.github.pullRequest'] = pullRequest.number;
    }
  } else if (sonarCloud && branch !== mainBranch) {
    props['sonar.branch.name'] = branch;
  }

  const prefix = msParams ? '/d:' : '-D';

  const params = [];
  Object.keys(props).forEach((name) => {
    const value = props[name];
    if (name.charAt(0) === prefix.charAt(0)) {
      params.push(`${name}${value}`);
    } else {
      params.push(`${prefix}${name}=${value}`);
    }
  });
  return params.join(' ');
};
