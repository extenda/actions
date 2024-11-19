const core = require('@actions/core');
const github = require('@actions/github');

const getOctokit = () => {
  const token = core.getInput('github-token');
  return new github.getOctokit(token);
};

const getPullRequest = async (octokit) => {
  if (github.context.payload.pull_request) {
    core.debug('Use existing pull_request event');
    return github.context.payload.pull_request;
  }
  core.debug('Find pull_request with octokit');
  const { owner, repo } = github.context.repo;
  const branch = github.context.ref.replace('refs/heads/', '');
  return octokit.rest.pulls
    .list({
      owner,
      repo,
      head: `${owner}:${branch}`,
      state: 'open',
    })
    .then((response) => response.data[0]);
};

const commitFiles = async (octokit, pullRequest, fileTree) => {
  const { owner, repo } = github.context.repo;
  return octokit.rest.git
    .createTree({
      owner,
      repo,
      tree: fileTree,
    })
    .then((tree) =>
      octokit.rest.git.createCommit({
        owner,
        repo,
        tree: tree.data.sha,
        message: 'build: Add qodana configuration files',
      }),
    )
    .then((commit) =>
      octokit.rest.git.updateRef({
        owner,
        repo,
        ref: pullRequest.head.ref,
        sha: commit.data.sha,
      }),
    );
};

module.exports = {
  getOctokit,
  getPullRequest,
  commitFiles,
};
