const core = require('@actions/core');
const sendMessage = require('./sendMessage');
const { run } = require('../../utils');

run(async () => {
  const title = core.getInput('title');
  const text = core.getInput('text', { required: true });
  const fallback = core.getInput('fallback');
  sendMessage(title, text, fallback);
});
