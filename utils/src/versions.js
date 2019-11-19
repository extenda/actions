const core = require('@actions/core');
const git = require('simple-git/promise')();
const util = require('util');
const path = require('path');
const fs = require('fs');
const semver = require('semver');
const gitSemverTags = util.promisify(require('git-semver-tags'));
const recommendedVersionBump = util.promisify(require('conventional-recommended-bump'));
const conventionalChangelog = require('conventional-changelog-core');
const conventionalCommits = require('conventional-changelog-conventionalcommits');
const streamToString = require('stream-to-string');

/**
 * The tag prefix used for releases.
 * @type {string}
 */
const tagPrefix = process.env.TAG_PREFIX || 'v';

const DEFAULT_VERSION = '0.0.0';

/**
 * Returns the latest tagged release matching the tag prefix.
 * @returns {Promise<string>}
 */
const getLatestRelease = async () => gitSemverTags({ tagPrefix }).then((tags) => {
  if (tags.length === 0) {
    core.info(`No release tags with prefix '${tagPrefix}' exists, use ${DEFAULT_VERSION}`);
  }
  return tags[0] || DEFAULT_VERSION;
});

/**
 * Returns the recommended version bump based on conventional commits since last tag.
 * @returns {Promise<string>}
 */
const getRecommendedBump = async () =>  {
  const config = await conventionalCommits();
  return recommendedVersionBump({
    config,
    tagPrefix,
  }).then(recommendation => recommendation.releaseType);
};

/**
 * Returns the version to build. This version number is determined by the last release number
 * and the conventional commits after that release.
 * @param versionSuffix optional version suffix, for example '-SNAPSHOT'
 * @returns {Promise<string>}
 */
const getBuildVersion = async (versionSuffix = '') => {
  const latestRelease = await getLatestRelease();
  const releaseType = await getRecommendedBump();
  core.info(`Conventional commits '${releaseType}' bump from ${latestRelease}`);
  return semver.inc(latestRelease, releaseType).concat(versionSuffix);
};

const getChangelog = async (version) => {
  const config = await conventionalCommits();
  config.writerOpts.headerPartial = '';

  // Create a dummy package.json
  const dummyPackageJson = path.join(__dirname, 'package.json');
  fs.writeFileSync(dummyPackageJson, JSON.stringify({
    name: 'Changelog',
    version,
  }), 'utf8');

  // This section contains hardcoded GitHub settings to make changelog work after ncc build.
  try {
    const stream = conventionalChangelog({
      config,
      tagPrefix,
      pkg: {
        path: __dirname,
      },
    }, {
      issue: 'issues',
      commit: 'commit'
    }, {},
      {
        referenceActions: [
          'close',
          'closes',
          'closed',
          'fix',
          'fixes',
          'fixed',
          'resolve',
          'resolves',
          'resolved',
        ],
      });
    return streamToString(stream).then(notes => notes.trim());
  } finally {
    fs.unlinkSync(dummyPackageJson);
  }
};

/**
 * Create a release tag and push it to origin.
 * @returns {Promise<{changelog: *, tagName: *, version: *}>}
 */
const tagReleaseVersion = async () => {
  const version = await getBuildVersion();
  const changelog = await getChangelog(version);
  const tagName = `${tagPrefix}${version}`;
  await git.addConfig('user.email', 'devops@extendaretail.com')
    .then(() => git.addConfig('user.name', 'GitHub Actions'))
    .then(() => git.addAnnotatedTag(
      tagName,
      `Release ${version}`))
    .then(() => git.pushTags());
  return {
    changelog,
    tagName,
    version,
  };
};

module.exports = {
  getBuildVersion,
  getChangelog,
  getLatestRelease,
  tagPrefix,
  tagReleaseVersion,
};
