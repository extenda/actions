const core = require('@actions/core');
const { checkEnv, gitConfig } = require('../../utils');

const run = async () => {
  try {
    checkEnv(['GITHUB_TOKEN']);
    await gitConfig();
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
