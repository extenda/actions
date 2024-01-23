const core = require('@actions/core');
const { run } = require('../../utils/src');

const action = async () => {
  core.warning(`
  This action is deprecated and does not publish policies anymore.
  Policies are published from the cloud-deploy action.
  `);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
