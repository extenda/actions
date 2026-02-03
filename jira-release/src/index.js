import * as core from '@actions/core';

import { checkEnv, run } from '../../utils/src/index.js';
import { createJiraRelease } from './jira-release.js';

const action = async () => {
  checkEnv(['JIRA_USERNAME', 'JIRA_PASSWORD']);

  const protocol = core.getInput('jira-protocol', { required: true });
  const host = core.getInput('jira-host', { required: true });
  const projectKey = core.getInput('jira-project', { required: true });
  const component = core.getInput('jira-component') || '';
  const version = core.getInput('version', { required: true });

  await createJiraRelease({
    protocol,
    host,
    projectKey,
    component,
    version,
  }).catch((err) =>
    core.error(`Failed to create release in Jira. Reason: ${err.message}`),
  );
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
