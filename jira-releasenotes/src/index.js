const core = require('@actions/core');
const { checkEnv, run } = require('../../utils');
const { createReleaseNotes } = require('./jira-releasenotes');

run(async () => {
  checkEnv(['JIRA_USERNAME', 'JIRA_PASSWORD']);

  const protocol = core.getInput('jira-protocol', { required: true });
  const host = core.getInput('jira-host', { required: true });
  const projectKey = core.getInput('jira-project', { required: true });
  const releaseNoteField = core.getInput('field-releasenote', {
    required: true,
  });

  await createReleaseNotes({
    protocol,
    host,
    projectKey,
    releaseNoteField,
  }).catch((err) =>
    core.error(`Failed to create release notes. Reason: ${err.message}`),
  );
});
