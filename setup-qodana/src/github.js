const core = require('@actions/core');
const exec = require('@actions/exec');
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
      response.data.check_runs.filter((check) =>
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

const getDefaultBranch = async (octokit) => {
  const { owner, repo } = github.context.repo;
  return octokit.rest.repos
    .get({
      owner,
      repo,
    })
    .then((response) => response.data.default_branch);
};

const getPullRequest = async (octokit) => {
  if (github.context.payload.pull_request) {
    return github.context.payload.pull_request;
  }
  const { owner, repo } = github.context.repo;
  return octokit.rest.pulls
    .list({
      owner,
      repo,
      head: `${owner}:${getCurrentBranch()}`,
      state: 'open',
    })
    .then((response) => response.data[0]);
};

const isFeatureBranch = async (octokit) => {
  if (!github.context.ref.startsWith('refs/heads')) {
    return false;
  }
  return getDefaultBranch(octokit).then(
    (defaultBranch) => defaultBranch !== getCurrentBranch(),
  );
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

const mergeBase = async (base, head) => {
  const output = await exec.getExecOutput('git', ['merge-base', base, head], {
    ignoreReturnCode: true,
  });
  if (output.exitCode === 0) {
    return output.stdout.trim();
  }
  return '';
};

const getQodanaPrSha = async (octokit) => {
  const defaultBranch = await getDefaultBranch(octokit);
  let sha = '';
  let prMode = true;
  let issueNumber = -1;
  if (defaultBranch === getCurrentBranch()) {
    core.info(`Analysis of default branch: ${defaultBranch}`);
    prMode = false;
  } else {
    const pullRequest = await getPullRequest(octokit);
    const prNumber = pullRequest ? `(#${pullRequest.number})` : '';
    core.info(`Analysis of feature branch: ${getCurrentBranch()} ${prNumber}`);
    if (pullRequest) {
      issueNumber = pullRequest.number;
      sha = await mergeBase(pullRequest.base.sha, pullRequest.head.sha);
    } else {
      sha = await mergeBase(`origin/${defaultBranch}`, github.context.sha);
    }
  }

  const { head_commit: { message = '' } = {} } = github.context.payload;
  if (message.includes('[force quality]') && prMode) {
    core.warning('pr-mode disabled with [force quality] comment.');
    prMode = false;
  }
  if (message.includes('[rebase quality]') && prMode) {
    core.warning('pr-mode disabled with [rebase quality] comment.');
    prMode = false;
  }
  if (message.includes('[init quality]') && prMode) {
    core.warning('pr-mode disabled with [init quality] comment.');
    prMode = false;
  }

  return { sha, prMode, issueNumber };
};

module.exports = {
  getOctokit,
  getQodanaChecks,
  getDefaultBranch,
  isFeatureBranch,
  getPullRequest,
  getCurrentBranch,
  commitFiles,
  getQodanaPrSha,
  mergeBase,
};
