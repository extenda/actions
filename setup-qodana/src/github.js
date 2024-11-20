const core = require('@actions/core');
const github = require('@actions/github');

const getOctokit = () => {
  const token = core.getInput('github-token');
  return new github.getOctokit(token);
};

const getCurrentBranch = () => github.context.ref.replace('refs/heads/', '');

const getQodanaChecks = async (octokit) => {
  const { owner, repo } = github.context.repo;
  let sha = github.context.sha;
  if (github.context.payload.pull_request) {
    sha = github.context.payload.pull_request.head.sha;
  }
  return octokit.rest.checks
    .listForRef({
      owner,
      repo,
      ref: sha,
    })
    .then((response) =>
      response.data.filter((check) =>
        check.name.toLowerCase().startsWith('qodana'),
      ),
    )
    .then((checks) =>
      checks.map((check) => ({
        name: check.name,
        conclusion: check.conclusion,
        success: check.status === 'completed' && check.conclusion === 'success',
      })),
    );
};

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
  getQodanaChecks,
  isFeatureBranch,
  getCurrentBranch,
  commitFiles,
};
