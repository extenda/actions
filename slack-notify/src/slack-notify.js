
const core = require('@actions/core');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { loadSecret } = require('../../gcp-secret-manager/src/secrets');

const buildFormData = async (channel, message, file) => {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  const formData = new FormData();
  formData.append('file', fs.createReadStream(file));
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
}).then(() => true)
  .catch((err) => {
    core.error(`Unable to send notification on slack! reason:\n${err}`);
    return false;
  });

const postFileToSlackChannel = async (slackData, message, file) => {
  const formData = await buildFormData(slackData.channel, message, file);
  const headers = { Authorization: `Bearer ${slackData.token}`, ...formData.getHeaders() };
  return axios({
    url: 'https://slack.com/api/files.upload',
    method: 'POST',
    data: formData,
    headers,
  }).then(() => true)
    .catch((err) => {
      core.error(`Unable to send notification on slack! reason:\n${err}`);
      return false;
    });
};

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
    return notifySlackWithFile(serviceAccount, message, channelName, file);
  }
  return notifySlackMessage(serviceAccount, message, channelName);
};

module.exports = notifySlack;
