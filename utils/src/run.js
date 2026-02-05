import core from '@actions/core';

/**
 * Run an async action and catch any exception.
 * @param action the action to run
 * @returns {Promise<void>}
 */
const run = async (action) => {
  if (
    process.env.VITEST ||
    process.env.JEST_WORKER_ID ||
    process.env.ER_ACTION_RUNNING === 'true'
  ) {
    // Don't run the action in a test environment and only run it once.
    // If an action imports another action, it will cause the action to
    // run multiple times, the ER_ACTION_RUNNING env ensures an action
    // can run at most once per invocation.
    return Promise.resolve();
  }
  try {
    process.env.ER_ACTION_RUNNING = 'true';
    await action();
  } catch (err) {
    core.setFailed(err.message);
  }
};

export default run;
