import * as core from '@actions/core';
import * as github from '@actions/github';

import { keyFromTitle } from '../../openspec-guard/src/tasks-md.js';
import { checkKey } from './check.js';
import { loadTasksFiles } from './store.js';

/**
 * Checks that the Jira key of a feat pull request title names exactly one group of a change in the store.
 * Only feat titles are checked; fix and every other type pass.
 */
const runSpecFirst = async ({ title, repo, store, storeRepo, ref }) => {
  const parsed = keyFromTitle(title);
  if (parsed.status === 'skip') {
    core.info('Title is not a feat title; spec-first does not apply.');
    core.setOutput('key', '');
    return;
  }
  if (parsed.status === 'missing') {
    core.error(
      "A feat pull request title needs its Jira key as scope, e.g. 'feat(HICC-123): Summary'.",
    );
    core.setFailed('The feat title has no Jira key scope.');
    return;
  }

  core.setOutput('key', parsed.key);
  const files = await store.loadTasksFiles(storeRepo, ref);
  const result = checkKey(files, parsed.key, repo);
  result.warnings.forEach((w) => core.warning(w));
  if (result.ok) {
    core.info(result.message);
  } else {
    result.errors.forEach((e) => core.error(e));
    core.setFailed(
      `Spec first: ${parsed.key} is not covered by exactly one group in ${storeRepo}.`,
    );
  }
};

const action = async () => {
  const storeRepo = core.getInput('store', { required: true });
  const token = core.getInput('token', { required: true });
  const ref = core.getInput('store-ref');
  const payload = github.context.payload;
  const title = core.getInput('title') || payload.pull_request?.title || '';
  const repo =
    core.getInput('repo-name') ||
    payload.repository?.name ||
    (process.env.GITHUB_REPOSITORY ?? '').split('/')[1] ||
    '';

  const octokit = github.getOctokit(token);
  const store = {
    loadTasksFiles: (storeName, storeRef) =>
      loadTasksFiles(octokit, storeName, storeRef),
  };
  return runSpecFirst({ title, repo, store, storeRepo, ref });
};

export { runSpecFirst };
export default action;
