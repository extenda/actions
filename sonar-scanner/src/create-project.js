import path from 'node:path';

import * as core from '@actions/core';
import axios from 'axios';
import qs from 'qs';

import { sonarAuth } from './sonar-credentials.js';

const logAxiosError = (prefix, error) => {
  const response = error?.response;
  if (!response) {
    core.error(prefix);
    return;
  }

  core.error(prefix);
  core.error(
    `Status: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
  );

  const requestId =
    response.headers?.['x-request-id'] ??
    response.headers?.['x-amz-cf-id'] ??
    response.headers?.['cf-ray'];
  if (requestId) {
    core.error(`Request ID: ${requestId}`);
  }

  if (typeof response.data === 'string') {
    core.error(`Body: ${response.data}`);
  } else if (response.data && typeof response.data === 'object') {
    core.error(`Body: ${JSON.stringify(response.data)}`);
  }
};

const projectExists = async (hostUrl, organization, project) =>
  axios
    .get(
      `${hostUrl}/api/projects/search?organization=${organization}&q=${project}`,
      { auth: await sonarAuth(hostUrl) },
    )
    .then((response) => {
      const {
        data: { components },
      } = response;
      return (
        components && components.length > 0 && components[0].key === project
      );
    });

const logProjectExistsFailure = (hostUrl, organization, project, error) => {
  logAxiosError(
    `Failed to check whether project '${project}' exists in ${hostUrl} for organization '${organization}'`,
    error,
  );
  throw error;
};

const createSonarCloudProject = async (hostUrl, workingDir) => {
  const repo = process.env.GITHUB_REPOSITORY.split('/');
  let project = repo.join('_');
  let name = repo[1] || '';
  if (workingDir && workingDir !== '.') {
    const suffix = path.basename(workingDir).replace(/^\.\/?/g, '') || '';
    name = `${name} | ${suffix}`;
    project = `${project}_${suffix}`;
  }

  if (
    await projectExists(hostUrl, repo[0], project).catch((error) =>
      logProjectExistsFailure(hostUrl, repo[0], project, error),
    )
  ) {
    core.debug(`Project '${project}' exists in ${hostUrl}`);
    return Promise.resolve();
  }

  return axios
    .post(
      `${hostUrl}/api/projects/create`,
      qs.stringify({
        name,
        // SonarCloud organizations are lowercase only
        organization: repo[0].toLowerCase(),
        project,
      }),
      {
        auth: await sonarAuth(hostUrl),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
      },
    )
    .then(() => {
      core.info(`Created project '${project}' in ${hostUrl}`);
    })
    .catch((error) => {
      logAxiosError(
        `Failed to create project '${project}' in ${hostUrl}`,
        error,
      );
      core.error(`Failed to create '${project}' in ${hostUrl}`);
    });
};

const createProject = async (hostUrl, workingDir = '.') => {
  if (hostUrl.startsWith('https://sonarcloud.io')) {
    return createSonarCloudProject(hostUrl, workingDir);
  }
  return Promise.resolve();
};

export { createProject };
