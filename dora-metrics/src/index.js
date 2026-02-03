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

// Entry point check removed for ESM compatibility

export default action;
