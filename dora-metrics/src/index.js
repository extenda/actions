import * as core from '@actions/core';

import { run } from '../../utils/src/index.js';
import generateBugLog from './bug-log.js';
import { generateFolders, uploadToBucket } from './deploy-log.js';

const action = async () => {
  const productName = core.getInput('product-name', { required: true });
  const component = core.getInput('product-component', { required: true });
  const jiraUsername = core.getInput('jira-username', { required: true });
  const jiraPassword = core.getInput('jira-password', { required: true });
  const jiraProjectKey = core.getInput('jira-project-key', { required: true });

  await generateFolders(productName);
  await generateBugLog(
    jiraUsername,
    jiraPassword,
    jiraProjectKey,
    productName,
    component,
  );
  await uploadToBucket(productName);
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
