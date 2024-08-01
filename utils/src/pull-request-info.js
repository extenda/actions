const core = require('@actions/core');
const github = require('@actions/github');
let { context } = require('@actions/github');

let pullRequestCache;

const fetchPullRequestInfo = async (githubToken) => {
  const octokit = github.getOctokit(githubToken);
  const { owner, repo } = context.repo;
  return octokit.rest.pulls
    .list({
      owner,
      repo,
      state: 'open',
      head: `${owner}:${context.ref.replace('refs/heads/', '')}`,
    })
    .then((response) => response.data.find((pr) => pr.head.sha === context.sha))
    .catch((err) => {
      core.warning(`Failed to find pull requests. Reason: ${err.message}`);
      return undefined;
    });
};

const getPullRequestInfo = async (githubToken) => {
  if (pullRequestCache) {
    return pullRequestCache;
  }

  if (context.eventName === 'pull_request') {
    const { pull_request: pullRequest } = context.payload;
    pullRequestCache = pullRequest;
  } else {
    pullRequestCache = await fetchPullRequestInfo(githubToken);
  }
  return pullRequestCache;
};

module.exports = {
  setContext: (ctx) => {
    // Used to mock the context in tests.
    context = ctx;
    pullRequestCache = undefined;
  },
  getPullRequestInfo,
};
