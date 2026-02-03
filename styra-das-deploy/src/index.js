import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.warning(`
  This action is deprecated and does not publish policies anymore.
  Policies are published from the cloud-deploy action.
  `);
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
