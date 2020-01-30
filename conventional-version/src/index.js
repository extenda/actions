const core = require('@actions/core');

const { checkEnv } = require('../../utils');
const versions = require('../../utils/src/versions');
const branchinfo = require('../../utils/src/branch-info');

const run = async () => {
  try {
    checkEnv(['GITHUB_REF', 'GITHUB_SHA']);

    const tagPrefix = core.getInput('tag-prefix', { required: true });
    const versionSuffix = core.getInput('version-suffix');
    const buildNumber = core.getInput('build-number');

    versions.tagPrefix = tagPrefix;
    const version = await versions.getBuildVersion(versionSuffix);

    core.info(`Project version: ${version}`);
    core.setOutput('version', version);

    /* branch outputs */
    const githubRef = process.env.GITHUB_REF;
    core.info(`GITHUB_REF: ${githubRef}`);

    const branchName = branchinfo.getBranchName(githubRef);
    core.info(`branch-name: ${branchName}`);
    core.setOutput('branch-name', branchName);

    const branchNameFriendly = branchinfo.getBranchNameFriendly(branchName);
    core.info(`branch-name-friendly: ${branchNameFriendly}`);
    core.setOutput('branch-name-friendly', branchNameFriendly);

    const isPreRel = branchinfo.isPreRelease(branchName);
    core.info(`is-prerelease: ${isPreRel}`);
    core.setOutput('is-prerelease', isPreRel);

    const sha = process.env.GITHUB_SHA;
    const shortSha = await branchinfo.getShortSha(sha);
    core.info(`short-sha: ${shortSha}`);
    core.setOutput('short-sha', shortSha);

    const composedVersion = branchinfo
      .getComposedVersionString(version, branchNameFriendly, buildNumber, shortSha);
    core.info(`composed-version-string: ${composedVersion}`);
    core.setOutput('composed-version-string', composedVersion);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
