import * as core from '@actions/core';

import { run } from '../../utils/src.js';

const action = async () => {
  core.warning(`
  This action is deprecated and does not publish policies anymore.
  Policies are published from the cloud-deploy action.
  `);
};

// Entry point check removed for ESM compatibility

export default action;
