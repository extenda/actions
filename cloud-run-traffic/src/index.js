import * as core from '@actions/core';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { run } from '../../utils/src/index.js';

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

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
