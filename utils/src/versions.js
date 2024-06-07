const core = require('@actions/core');
const simpleGit = require('simple-git');
const semver = require('semver');
const gitConfig = require('./git-config');
const changes = require('./conventionalchanges');

const DEFAULT_VERSION = '0.0.0';

/**
 * Returns the latest tagged release matching the tag prefix.
 * @returns {Promise<string>}
 */
const getLatestReleaseTag = async () => {
  const git = simpleGit();

  const tags = await git.tags(['--sort=-version:refname', '--merged', 'HEAD', `${changes.getTagPrefix()}*`]);
  if (tags.all.length === 0) {
    core.info(`No release tags with prefix '${changes.getTagPrefix()}' exists, use ${changes.getTagPrefix()}${DEFAULT_VERSION}`);
  }

  return tags.all[0] || `${changes.getTagPrefix()}${DEFAULT_VERSION}`;
};

/**
 * Returns the latest semantic release matching the tag prefix.
 * @returns {Promise<string>}
 */
const getLatestRelease = async () => getLatestReleaseTag()
  .then((tag) => tag.replace(changes.getTagPrefix(), ''));

/**
 * Returns the version to build. This version number is determined by the last release number
 * and the conventional commits after that release.
 * @param versionSuffix optional version suffix, for example '-SNAPSHOT'
 * @returns {Promise<string>}
 */
const getBuildVersion = async (versionSuffix = '') => {
  const latestRelease = await getLatestRelease();

  const releaseType = await changes.getRecommendedBump();

  core.info(`Conventional commits '${releaseType}' bump from ${latestRelease}`);
  return semver.inc(semver.coerce(latestRelease), releaseType).concat(versionSuffix);
};

/**
 * Create a release tag and push it to origin.
 * @returns {Promise<{changelog: *, tagName: *, version: *}>}
 */
const tagReleaseVersion = async () => {
  const version = await getBuildVersion();
  const changelog = await changes.getChangelog(version);
  const tagName = `${changes.getTagPrefix()}${version}`;
  await gitConfig();

  const git = simpleGit();
  await git.addAnnotatedTag(tagName, `Release ${version}`);
  await git.pushTags();

  return {
    changelog,
    tagName,
    version,
  };
};

const setTagPrefix = (prefix) => {
  changes.setTagPrefix(prefix);
};

module.exports = {
  ...changes,
  setTagPrefix,
  getBuildVersion,
  getLatestRelease,
  getLatestReleaseTag,
  tagReleaseVersion,
};
