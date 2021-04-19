const core = require('@actions/core');
const JiraClient = require('jira-client');
const { generateFolders } = require('./deploy-log');

const handleIssues = async (issue, clanName) => {
  const promises = [];
  if (issue) {
    for (const bug of issue.issues) {
      const issueFields = bug.fields;
      const bugCreatedDate = issueFields.created;
      promises.push(generateFolders(clanName, 'bugs', new Date(bugCreatedDate)));
    }
  }
  return Promise.all(promises);
};

const generateBugLog = async (jiraUsername, jiraPassword, projectKey, clanName) => {
  const client = new JiraClient({
    protocol: 'https',
    host: 'jira.extendaretail.com',
    username: jiraUsername,
    password: jiraPassword,
    apiVersion: '2',
    strictSSL: true,
  });

  const serviceIssues = await client.searchJira(`project=${projectKey} AND issueType=bug`, { maxResults: 1000 }).catch(() => core.info('No bugs found for service!'));
  await handleIssues(serviceIssues, clanName);
};

module.exports = generateBugLog;
