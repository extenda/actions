const fs = require('fs');
const path = require('path');
const util = require('util');

const recommendedVersionBump = util.promisify(require('conventional-recommended-bump'));
const gitRawCommits = require('git-raw-commits');
const conventionalCommitsParser = require('conventional-commits-parser');
const conventionalChangelog = require('conventional-changelog-core');
const conventionalCommits = require('conventional-changelog-conventionalcommits');
const streamToString = require('stream-to-string');
const through2 = require('through2');
const mergeConfig = require('conventional-changelog-core/lib/merge-config');
const { getTagAtCommit } = require('./branch-info');

const tagPrefix = process.env.TAG_PREFIX || 'v';

/**
 * Returns the recommended version bump based on conventional commits since last tag.
 * @returns {Promise<string>}
 */
const getRecommendedBump = async () => {
  const config = await conventionalCommits();
  return recommendedVersionBump({
    config,
    tagPrefix,
  }).then((recommendation) => recommendation.releaseType);
};

const withConventionalConfig = async (version, fn) => {
  const config = await conventionalCommits();
  config.writerOpts.headerPartial = '';
  const recommendedVersion = version || await getRecommendedBump();

  // If current commit is tagged, include two releases.
  const tag = await getTagAtCommit(process.env.GITHUB_SHA || 'HEAD');
  const releaseCount = tag.startsWith(tagPrefix) ? 2 : 1;

  // Create a dummy package.json
  const dummyPackageJson = path.join(__dirname, 'package.json');
  fs.writeFileSync(dummyPackageJson, JSON.stringify({
    name: 'Changelog',
    version: recommendedVersion,
  }), 'utf8');

  try {
    return fn({
      config,
      tagPrefix,
      releaseCount,
      pkg: {
        path: __dirname,
      },
    },
    {
      issue: 'issues',
      commit: 'commit',
    },
    {},
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
    },
    {});
  } finally {
    fs.unlinkSync(dummyPackageJson);
  }
};

const getCommitStream = async (version) => withConventionalConfig(
  version, (options, context, gitRawCommitsOpts, parserOpts, writerOpts) => mergeConfig(
    options, context, gitRawCommitsOpts, parserOpts, writerOpts,
  ).then((data) => gitRawCommits(data.gitRawCommitsOpts, data.gitRawExecOpts)
    .pipe(conventionalCommitsParser(data.parserOpts))),
);

/**
 * Return all conventional commits from the previous version.
 * @returns {Promise<[*]>}
 */
const getConventionalCommits = async () => {
  const commitStream = await getCommitStream();
  return new Promise((resolve, reject) => {
    const commits = [];
    commitStream.on('finish', () => {
      resolve(commits);
    }).on('error', (err) => {
      reject(err);
    }).pipe(through2.obj((chunk, enc, cb) => {
      if (chunk.type != null) {
        commits.push(chunk);
      }
      cb();
    }));
  });
};

/**
 * Returns a markdown formatted changelog for all conventional changes from the last release
 * up until this commit.
 * @param version the name of the version built now
 * @returns {Promise<string>}
 */
const getChangelog = async (version) => withConventionalConfig(
  version, (options, context, gitRawCommitsOpts, parserOpts, writerOpts) => {
    const out = conventionalChangelog(options, context, gitRawCommitsOpts, parserOpts, writerOpts);
    return streamToString(out).then((notes) => notes.trim());
  },
);

module.exports = {
  getRecommendedBump,
  getChangelog,
  getConventionalCommits,
  tagPrefix,
};
