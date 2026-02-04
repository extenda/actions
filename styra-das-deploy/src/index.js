import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.warning(`
  This action is deprecated and does not publish policies anymore.
  Policies are published from the cloud-deploy action.
  `);
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
