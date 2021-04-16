const JiraClient = require('jira-client');
const core = require('@actions/core');
const { generateFolders, uploadToBucket } = require('./deploy-log');
const { findJiraChanges } = require('../../jira-releasenotes/src/jira-releasenotes');

const handleIssues = async (issue, serviceName) => {
  const promises = [];
  if (issue) {
    for (const bug of issue.issues) {
      const issueFields = bug.fields;
      const bugCreatedDate = issueFields.created;
      promises.push(generateFolders(serviceName, 'bugs', new Date(bugCreatedDate)));
    }
  }
  return Promise.all(promises);
};

const generateBugLog = async (jiraUsername, jiraPassword, projectKey, serviceName) => {
  const client = new JiraClient({
    protocol: 'https',
    host: 'jira.extendaretail.com',
    username: jiraUsername,
    password: jiraPassword,
    apiVersion: '2',
    strictSSL: true,
  });

  const promises = [];
  const issueKeys = await findJiraChanges(projectKey);
  Object.keys(issueKeys).forEach((issueKey) => {
    promises.push(client.searchJira(`project=${projectKey} AND issueType=bug AND key=${issueKey}`)
      .then((issue) => handleIssues(issue, serviceName))
      .catch(() => core.info(`No issue found with key ${issueKey}`)));
  });

  await Promise.all(promises);

  const serviceIssues = await client.searchJira(`project=${projectKey} AND issueType=bug AND component="${serviceName}"`, { maxResults: 1000 }).catch(() => core.info('No bugs found for service!'));
  await handleIssues(serviceIssues, serviceName);
  await uploadToBucket(serviceName);
};

module.exports = generateBugLog;
