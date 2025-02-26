const core = require('@actions/core');
const axios = require('axios');

const createProject = async (qodanaToken, qodanaTeam) => {
  if (process.env.QODANA_TOKEN) {
    return process.env.QODANA_TOKEN;
  }
  const qodanaProject = process.env.GITHUB_REPOSITORY.split('/')[1];
  return axios
    .create()
    .post(
      'https://api.qodana.cloud/v1/public/organizations/teams/projects',
      {
        teamName: qodanaTeam,
        projectName: qodanaProject,
      },
      {
        headers: {
          authorization: `Bearer ${qodanaToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
    .then((response) => {
      if (response.status === 201) {
        core.info(`Created new project: ${qodanaTeam}/${qodanaProject}`);
      }
      return response.data;
    });
};

module.exports = createProject;
