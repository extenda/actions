import * as core from '@actions/core';
import * as github from '@actions/github';

import { loadSecret } from '../../gcp-secret-manager/src/secrets.js';
import { loadGitHubToken, run } from '../../utils/src/index.js';

const validateState = (state) => {
  switch (state) {
    case 'pending':
    case 'success':
    case 'failure':
      return state;
    case 'cancelled':
      return 'failure';
    default:
      throw new Error(`Unsupported state: '${state}'`);
  }
};

const checkRun = async (
  repository,
  sha,
  context,
  state,
  description,
  targetUrl,
) => {
  const validState = validateState(state);

  const token = await loadGitHubToken(loadSecret);
  const octokit = github.getOctokit(token);

  const [owner, repo] = repository.split('/');

  const args = {
    owner,
    repo,
    sha,
    state: validState,
    context,
    description,
  };

  if (targetUrl) {
    args.target_url = targetUrl;
  }

  return octokit.rest.repos.createCommitStatus(args);
};

const action = async () => {
  const repository =
    core.getInput('repository') || process.env.GITHUB_REPOSITORY;
  const sha = core.getInput('sha') || process.env.GITHUB_SHA;
  const context = core.getInput('context', { required: true });
  const state = core.getInput('state', { required: true });
  const description = core.getInput('description', { required: true });
  const targetUrl = core.getInput('target-url');

  return checkRun(repository, sha, context, state, description, targetUrl);
};

// Run the action if we are not running in a test environment
if (!process.env.VITEST && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
