const core = require('@actions/core');
const github = require('@actions/github');

const getOctokit = () => {
  const token = core.getInput('github-token');
  return new github.getOctokit(token);
};

const getCurrentBranch = () => github.context.ref.replace('refs/heads/', '');

const isFeatureBranch = async (octokit) => {
  if (!github.context.ref.startsWith('refs/heads')) {
    return false;
  }
  const { owner, repo } = github.context.repo;
  return octokit.rest.repos
    .get({
      owner,
      repo,
    })
    .then((response) => response.data.default_branch)
    .then((defaultBranch) => defaultBranch !== getCurrentBranch());
};

const commitFiles = async (octokit, fileTree) => {
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
        ref: github.context.ref,
        sha: commit.data.sha,
      }),
    );
};

module.exports = {
  getOctokit,
  isFeatureBranch,
  getCurrentBranch,
  commitFiles,
};
