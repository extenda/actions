const core = require('@actions/core');
const { GitHub } = require('@actions/github');
let { context } = require('@actions/github');

const getPullRequestInfo = async (githubToken) => {
  if (context.eventName === 'pull_request') {
    const { pull_request: pullRequest } = context.payload;
    return pullRequest;
  }

  const octokit = new GitHub(githubToken);
  const { owner, repo } = context.repo;
  return octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    head: `${owner}:${context.ref.replace('refs/heads/', '')}`,
  }).then((response) => response.data.find(
    (pr) => pr.head.sha === context.sha,
  )).catch((err) => {
    core.warning(`Failed to find pull requests. Reason: ${err.message}`);
    return undefined;
  });
};

module.exports = {
  setContext: (ctx) => {
    context = ctx;
  },
  getPullRequestInfo,
};
