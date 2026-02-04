import { fileURLToPath } from 'node:url';
import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';

const action = async () => {
  core.warning(`
  This action is deprecated and does not publish policies anymore.
  Policies are published from the cloud-deploy action.
  `);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run(action);
}

export default action;
