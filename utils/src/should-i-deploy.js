const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');

async function shouldIDeploy(env) {
  const commitMessage = github.context.payload.head_commit.message;
  const timeZone = core.getInput('timezone') || 'UTC';
  const url = `https://shouldideploy.today/api?tz=${timeZone}`;

  if (env === 'staging') {
    return;
  }

  if (commitMessage.includes('[force deploy]')) {
    core.info('Force deploy detected, skipping should deploy check.');
    return;
  }

  try {
    const response = await axios.get(url);
    const shouldDeploy = response.data.shouldideploy;

    core.info(`Should deploy: ${shouldDeploy}`);
    if (!shouldDeploy) {
      throw new Error('Deployment is not recommended today.');
    }
  } catch (error) {
    throw new Error(`Failed to check deployment status: ${error.message}`);
  }
}

module.exports = shouldIDeploy;
