import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';
import notifySlack from './slack-notify.js';

const action = async () => {
  const serviceAccount = core.getInput('service-account-key', {
    required: true,
  });
  const text = core.getInput('text', { required: true });
  const channel = core.getInput('channel') || '';
  const file = core.getInput('file') || '';
  await notifySlack(serviceAccount, text, channel, file);
};

run(action);

export default action;
