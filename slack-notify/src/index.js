const core = require('@actions/core');
const { run } = require('../../utils/src');
const notifySlack = require('./slack-notify');

const action = async () => {
  const serviceAccount = core.getInput('service-account-key', {
    required: true,
  });
  const text = core.getInput('text', { required: true });
  const channel = core.getInput('channel') || '';
  const file = core.getInput('file') || '';
  await notifySlack(serviceAccount, text, channel, file);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
