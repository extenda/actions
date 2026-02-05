import * as core from '@actions/core';

import { checkEnv, gitConfig } from '../../utils/src/index.js';

const action = async () => {
  try {
    checkEnv(['GITHUB_TOKEN']);
    await gitConfig();
  } catch (error) {
    core.setFailed(error.message);
  }
};

export default action;
