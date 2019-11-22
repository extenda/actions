const core = require('@actions/core');
const { waitForChecks } = require('./status-checks');

const run = async () => {
  try {
    const checks = core.getInput('checks', { required: true }).split(/\s+/);
    const retryInterval = Number(core.getInput('retry-interval', { required: true })) * 1000;

    const status = await waitForChecks(checks, retryInterval);
    if (!status) {
      core.setFailed('Required status check(s) were not successful.');
    }
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
