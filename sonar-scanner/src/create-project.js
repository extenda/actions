import * as core from '@actions/core';
import axios from 'axios';
import path from 'path';
import qs from 'qs';

import { sonarAuth } from './sonar-credentials.js';

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

const createSonarCloudProject = async (hostUrl, workingDir) => {
  const repo = process.env.GITHUB_REPOSITORY.split('/');
  let project = repo.join('_');
  let name = repo[1] || '';
  if (workingDir && workingDir !== '.') {
    const suffix = path.basename(workingDir).replace(/^\.\/?/g, '') || '';
    name = `${name} | ${suffix}`;
    project = `${project}_${suffix}`;
  }

  if (await projectExists(hostUrl, repo[0], project)) {
    core.debug(`Project '${project}' exists in ${hostUrl}`);
    return Promise.resolve();
  }

  return axios
    .post(
      `${hostUrl}/api/projects/create`,
      qs.stringify({
        name,
        organization: repo[0],
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
    .catch(() => {
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
