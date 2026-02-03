import core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud';
import { run } from '../../utils/src';

async function action() {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const service = core.getInput('service', { required: true });

  const projectId = await setupGcloud(serviceAccountKey);

  const serviceManagerUrl = `https://operations.retailsvc.com/ui/platform/service-manager/${projectId}/${service}`;
  const deprecationMsg =
    'This action is deprecated and is going to be removed soon. ' +
    `It's recommended to use [Service manager UI](${serviceManagerUrl}) instead.`;

  throw new Error(deprecationMsg);
}

if (require.main === module) {
  run(action);
}

module.exports = action;
