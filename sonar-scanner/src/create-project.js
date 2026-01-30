const core = require('@actions/core');
const axios = require('axios');
const path = require('path');
const qs = require('qs');
const { sonarAuth } = require('./sonar-credentials');

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
    const suffix = path.basename(workingDir);
    name = `${name} | ${suffix}`;
    project = `${repo[1]}`;
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

module.exports = {
  createProject,
};
