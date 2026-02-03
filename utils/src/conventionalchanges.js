import fs from 'fs';
import path from 'path';
import util from 'util';

const recommendedVersionBump = util.promisify(
  require('conventional-recommended-bump'),
);
import conventionalCommits from 'conventional-changelog-conventionalcommits';
import conventionalChangelog from 'conventional-changelog-core';
import mergeConfig from 'conventional-changelog-core/lib/merge-config';
import conventionalCommitsParser from 'conventional-commits-parser';
import gitRawCommits from 'git-raw-commits';
import streamToString from 'stream-to-string';
import through2 from 'through2';

import { getTagAtCommit } from './branch-info.js';

let tagPrefix = process.env.TAG_PREFIX || 'v';

/**
 * Returns the recommended version bump based on conventional commits since last tag.
 * @returns {Promise<string>}
 */
export const getRecommendedBump = async () => {
  const config = await conventionalCommits();
  return recommendedVersionBump({
    config,
    tagPrefix,
  }).then((recommendation) => recommendation.releaseType);
};

const withConventionalConfig = async (version, fn) => {
  const config = await conventionalCommits();
  config.writerOpts.headerPartial = '';
  const recommendedVersion = version || (await getRecommendedBump());

  // If current commit is tagged, include two releases.
  const tag = await getTagAtCommit(process.env.GITHUB_SHA || 'HEAD');
  const releaseCount = tag.startsWith(tagPrefix) ? 2 : 1;

  // Create a dummy package.json
  const dummyPackageJson = path.join(__dirname, 'package.json');
  fs.writeFileSync(
    dummyPackageJson,
    JSON.stringify({
      name: 'Changelog',
      version: recommendedVersion,
    }),
    'utf8',
  );

  try {
    return fn(
      {
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
      {},
    );
  } finally {
    fs.unlinkSync(dummyPackageJson);
  }
};

const getCommitStream = async (version) =>
  withConventionalConfig(
    version,
    (options, context, gitRawCommitsOpts, parserOpts, writerOpts) =>
      mergeConfig(
        options,
        context,
        gitRawCommitsOpts,
        parserOpts,
        writerOpts,
      ).then((data) =>
        gitRawCommits(data.gitRawCommitsOpts, data.gitRawExecOpts).pipe(
          conventionalCommitsParser(data.parserOpts),
        ),
      ),
  );

/**
 * Return all conventional commits from the previous version.
 * @returns {Promise<[*]>}
 */
export const getConventionalCommits = async () => {
  const commitStream = await getCommitStream();
  return new Promise((resolve, reject) => {
    const commits = [];
    commitStream
      .on('finish', () => {
        resolve(commits);
      })
      .on('error', (err) => {
        reject(err);
      })
      .pipe(
        through2.obj((chunk, enc, cb) => {
          if (chunk.type != null) {
            commits.push(chunk);
          }
          cb();
        }),
      );
  });
};

/**
 * Returns a markdown formatted changelog for all conventional changes from the last release
 * up until this commit.
 * @param version the name of the version built now
 * @returns {Promise<string>}
 */
export const getChangelog = async (version) =>
  withConventionalConfig(
    version,
    (options, context, gitRawCommitsOpts, parserOpts, writerOpts) => {
      const out = conventionalChangelog(
        options,
        context,
        gitRawCommitsOpts,
        parserOpts,
        writerOpts,
      );
      return streamToString(out).then((notes) => notes.trim());
    },
  );

export const setTagPrefix = (prefix) => {
  tagPrefix = prefix;
};

export const getTagPrefix = () => tagPrefix;
