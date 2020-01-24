const core = require('@actions/core');

const { checkEnv } = require('../../utils');
const { getBranchName, getSuffix, isPreRelease } = require('./branch-info');

const run = async () => {
  checkEnv(['GITHUB_REF']);

  try {
    const githubRef = process.env.GITHUB_REF;
    core.info(`GITHUB_REF: ${githubRef}`);

    const branchName = getBranchName(githubRef);
    core.info(`simple-branch-name: ${branchName}`);
    core.setOutput('simple-branch-name', branchName);

    const isPreRel = isPreRelease(branchName);
    core.info(`is-prerelease: ${isPreRel}`);
    core.setOutput('is-prerelease', isPreRel);

    const suffix = getSuffix(branchName);
    core.info(`suffix: ${suffix}`);
    core.setOutput('suffix', suffix);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
