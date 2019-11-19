const core = require('@actions/core');
const axios = require('axios');
const qs = require('qs');

const auth = {
  username: process.env.SONAR_TOKEN,
  password: '',
};

const projectExists = async (hostUrl, organization, project) => {
  return axios.get(
    `${hostUrl}/api/projects/search?organization=${organization}&q=${project}`,
    { auth })
    .then((response) => {
      const { data: { components }} = response;
      return components && components.length > 0 && components[0].key === project;
    });
};

const createSonarCloudProject = async (hostUrl) => {
  const repo = process.env.GITHUB_REPOSITORY.split('/');
  const project = repo.join('_');

  if (await projectExists(hostUrl, repo[0], project)) {
    core.debug(`Project '${project}' exists in ${hostUrl}`);
    return Promise.resolve();
  }

  return axios.post(`${hostUrl}/api/projects/create`, qs.stringify({
    name: repo[1],
    organization: repo[0],
    project,
  }), {
    auth,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
    }
  }).then(() => {
    core.info(`Created project '${project}' in ${hostUrl}`);
  }).catch(() => {
    core.error(`Failed to create '${project}' in ${hostUrl}`);
  });
};

const createProject = async (hostUrl) => {
  if (hostUrl.startsWith('https://sonarcloud.io')) {
    return createSonarCloudProject(hostUrl);
  }
  return Promise.resolve();
};

module.exports = {
  createProject,
};
