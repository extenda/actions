
const core = require('@actions/core');
const axios = require('axios');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const postSlackMessageToChannel = async (
  token, message, channelName,
) => axios({
  url: 'https://slack.com/api/chat.postMessage',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  },
  data: {
    channel: channelName,
    text: message,
  },
}).catch((err) => {
  core.error(`Unable to send notification on slack! reason:\n${err}`);
});

const notifySlack = async (serviceAccount, message, channelName) => {
  let channel = channelName;
  const slackToken = await loadSecret(serviceAccount, 'slack-notify-token');
  if (!channel) {
    channel = await loadSecret(serviceAccount, 'clan-slack-channel');
  }
  await postSlackMessageToChannel(slackToken, message, channel);
};

module.exports = notifySlack;
