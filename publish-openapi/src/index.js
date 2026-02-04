import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.info('THIS ACTION HAS BEEN DEPRECATED');
  core.info('Information for the developer portal:');
  core.info(
    'https://github.com/extenda/hiiretail-developer-docs#hii-retail-developer-portal',
  );
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
