import * as core from '@actions/core';

/**
 * Run an async action and catch any exception.
 * @param action the action to run
 * @returns {Promise<void>}
 */
const run = async (action) => {
  if (process.env.VITEST || process.env.JEST_WORKER_ID) {
    // Don't run the action in a test environment
    return Promise.resolve();
  }
  try {
    await action();
  } catch (err) {
    core.setFailed(err.message);
  }
};

export default run;
