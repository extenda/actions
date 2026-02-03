import core from '@actions/core';

import { checkEnv, run } from '../../utils';
import { createReleaseNotes } from './jira-releasenotes';

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
