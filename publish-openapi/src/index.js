import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info(
    'https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal',
  );
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
