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
    // Don't run the action in a test environment and only run one at a time.
    // This means we don't risk running actions twice if import loops occur.
    return Promise.resolve();
  }
  try {
    process.env.ER_ACTION_RUNNING = 'true';
    await action();
  } catch (err) {
    core.setFailed(err.message);
  } finally {
    process.env.ER_ACTION_RUNNING = 'false';
  }
};

export default run;
