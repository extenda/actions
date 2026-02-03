import * as core from '@actions/core';
import axios from 'axios';
import fs from 'fs';

import { loadSecret } from '../../gcp-secret-manager/src/secrets.js';
import uploadToBucket from './upload-to-bucket.js';

const filePreview = (file, maxLines = 26) => {
  if (!fs.existsSync(file)) {
    return '_File not found for preview_';
  }
  const content = fs.readFileSync(file, 'utf8');
  const allLines = content.split('\n');
  let lines = allLines.slice(0, maxLines);
  let preview = lines.join('\n');
  let note = '';
  if (allLines.length > maxLines) {
    note += '\nPreview truncated. Download the file to see full content...';
  }
  return `\n*Preview:*\n\`\`\`${preview}\`\`\`${note}`;
};

const initSlack = async (serviceAccount, channelName) => {
  let channel = channelName;
  const slackToken = await loadSecret(serviceAccount, 'slack_notify_token');
  if (!channel) {
    channel = await loadSecret(serviceAccount, 'clan_slack_channel');
  }
  return { token: slackToken, channel };
};

const postMessageToSlackChannel = async (slackData, message) =>
  axios({
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
  })
    .then(() => true)
    .catch((err) => {
      core.error(`Unable to send notification on slack! reason:\n${err}`);
      return false;
    });

const postFileToSlackChannel = async (slackData, message, file) => {
  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }
  return uploadToBucket(file, 'gs://extenda-slack-notify-files').then(() => {
    const fileName = file.split('/').pop();
    const preview = filePreview(file);
    message =
      message +
      preview +
      `\n<https://storage.cloud.google.com/extenda-slack-notify-files/${fileName}|See full content>`;
    return postMessageToSlackChannel(slackData, message);
  });
};

const notifySlackMessage = async (serviceAccount, message, channelName) =>
  initSlack(serviceAccount, channelName).then((slackData) =>
    postMessageToSlackChannel(slackData, message),
  );

const notifySlackWithFile = async (
  serviceAccount,
  message,
  channelName,
  file,
) =>
  initSlack(serviceAccount, channelName).then((slackData) =>
    postFileToSlackChannel(slackData, message, file),
  );

const notifySlack = async (serviceAccount, message, channelName, file) => {
  if (file) {
    return notifySlackWithFile(serviceAccount, message, channelName, file);
  }
  return notifySlackMessage(serviceAccount, message, channelName);
};

export default notifySlack;
