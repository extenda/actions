const core = require('@actions/core');
const JiraClient = require('jira-client');
const { getConventionalCommits } = require('../../utils/src/versions');

const findJiraChanges = async (projectKey) => {
  const issueIdRegEx = new RegExp(`${projectKey}-([0-9]+)`, 'g');
  const commits = await getConventionalCommits();
  const issues = {};
  commits.forEach((commit) => {
    const {
      scope,
      type,
      subject,
      body,
      footer,
      notes,
      hash,
    } = commit;
    const content = `${scope} ${subject} ${body || ''} ${footer || ''}`;
    new Set(content.match(issueIdRegEx)).forEach((issueKey) => {
      if (issues[issueKey]) {
        core.warning(`${issueKey} was referred by multiple commits. Last entry wins!`);
      }
      issues[issueKey] = {
        subject,
        type,
        body: body || '',
        notes,
        hash,
      };
    });
  });
  return issues;
};

const findCustomFieldId = async (client, fieldName) => client.listFields()
  .then((fields) => fields.find((f) => f.name === fieldName).id);

const createUpdate = (change, releaseNoteFieldId) => {
  const update = { fields: {} };
  update.fields[releaseNoteFieldId] = `${change.subject}\n\n${change.body}`.trim();
  // TODO Add BREAKING CHANGE information somewhere?
  return update;
};

const createReleaseNotes = async ({
  protocol,
  host,
  projectKey,
  releaseNoteField,
}) => {
  const changes = await findJiraChanges(projectKey);

  if (!changes) {
    return null;
  }

  const client = new JiraClient({
    protocol,
    host,
    username: process.env.JIRA_USERNAME,
    password: process.env.JIRA_PASSWORD,
    apiVersion: '2',
    strictSSL: protocol === 'https',
  });

  const releaseNoteFieldId = await findCustomFieldId(client, releaseNoteField);
  const requests = [];
  Object.keys(changes).forEach((issueKey) => {
    const change = changes[issueKey];
    requests.push(client.getIssue(issueKey, `summary, fixVersions, resolution, status, ${releaseNoteFieldId}`)
      .then((issue) => {
        if (issue.fields[releaseNoteFieldId] === null) {
          const update = createUpdate(change, releaseNoteFieldId);
          return client.updateIssue(issueKey, update).then(() => {
            core.info(`Issue ${issueKey} was updated with a release note`);
          });
        }
        core.info(`Skip issue ${issueKey}. It already has a release note`);
        return null;
      })
      .catch((err) => core.warning(`Failed to update issue. ${err.message}`)));
  });

  return Promise.all(requests);
};

module.exports = {
  createReleaseNotes,
  findJiraChanges,
};
