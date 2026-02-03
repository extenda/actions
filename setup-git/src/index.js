import core from '@actions/core';

import { checkEnv, gitConfig } from '../../utils';

const run = async () => {
  try {
    checkEnv(['GITHUB_TOKEN']);
    await gitConfig();
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
