const core = require('@actions/core');
const { run } = require('../../utils/src');
const notifySlack = require('./slack-notify');

run(async () => {
  const serviceAccount = core.getInput('service-account-key', { required: true });
  const text = core.getInput('text', { required: true });
  const channel = core.getInput('channel') || '';
  await notifySlack(serviceAccount, text, channel);
});
