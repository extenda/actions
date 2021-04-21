const core = require('@actions/core');
const { run } = require('../../utils');
const generateBugLog = require('./bug-log');
const { generateFolders, uploadToBucket } = require('./deploy-log');

const action = async () => {
  const productName = core.getInput('product-name', { required: true });
  const jiraUsername = core.getInput('jira-username', { required: true });
  const jiraPassword = core.getInput('jira-password', { required: true });
  const jiraProjectKey = core.getInput('jira-project-key', { required: true });

  await generateFolders(productName);
  await generateBugLog(jiraUsername, jiraPassword, jiraProjectKey, productName);
  await uploadToBucket(productName);
};

if (require.main === module) {
  run(action);
}

module.exports = action;
