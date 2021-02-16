
const core = require('@actions/core');
const axios = require('axios');
const FormData = require('form-data');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const buildFormData = async (channel, message, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('channels', channel);
  formData.append('initial_comment', message);
  return formData;
};

const initSlack = async (serviceAccount, channelName) => {
  let channel = channelName;
  const slackToken = await loadSecret(serviceAccount, 'slack_notify_token');
  if (!channel) {
    channel = await loadSecret(serviceAccount, 'clan_slack_channel');
  }
  return { token: slackToken, channel };
};

const postMessageToSlackChannel = async (
  slackData, message,
) => axios({
  url: 'https://slack.com/api/chat.postMessage',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${slackData.token}`,
  },
  data: {
    channel: slackData.channel,
    text: message,
  },
}).catch((err) => {
  core.error(`Unable to send notification on slack! reason:\n${err}`);
});

const postFileToSlackChannel = async (
  slackData, message, file,
) => axios({
  url: 'https://slack.com/api/files.upload',
  method: 'POST',
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    authorization: `Bearer ${slackData.token}`,
  },
  data: await buildFormData(slackData.channel, message, file),
}).catch((err) => {
  core.error(`Unable to send notification on slack! reason:\n${err}`);
});

const notifySlackMessage = async (
  serviceAccount, message, channelName,
) => initSlack(serviceAccount, channelName)
  .then((slackData) => postMessageToSlackChannel(slackData, message));

const notifySlackWithFile = async (
  serviceAccount, message, channelName, file,
) => initSlack(serviceAccount, channelName)
  .then((slackData) => postFileToSlackChannel(slackData, message, file));

const notifySlack = async (serviceAccount, message, channelName, file) => {
  if (file) {
    await notifySlackWithFile(serviceAccount, message, channelName, file);
  } else {
    await notifySlackMessage(serviceAccount, message, channelName);
  }
};

module.exports = notifySlack;
