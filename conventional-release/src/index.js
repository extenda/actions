import * as core from '@actions/core';
import * as github from '@actions/github';

import { checkEnv, run } from '../../utils/src/index.js';
import * as versions from '../../utils/src/versions.js';

const createGitHubRelease = async (release, name) => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const { owner, repo } = github.context.repo;
  const response = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: release.tagName,
    name: `${name} ${release.version}`,
    body: release.changelog,
    prerelease: core.getBooleanInput('pre-release'),
    make_latest: String(core.getBooleanInput('make-latest')),
  });

  const { data } = response;
  core.info(`Created GitHub release ${data.html_url}`);
  return data;
};

const action = async () => {
  try {
    const tagPrefix = core.getInput('tag-prefix', { required: true });
    const name = core.getInput('name') || 'Release';

    checkEnv(['GITHUB_TOKEN']);

    versions.setTagPrefix(tagPrefix);
    const release = await versions.tagReleaseVersion();

    const data = await createGitHubRelease(release, name);

    core.info(`Created release tag ${release.tagName}`);

    core.setOutput('version', release.version);
    core.setOutput('release-tag', `${release.tagName}`);
    core.setOutput('release-changelog', `${release.changelog}`);
    core.setOutput('release-id', data.id);
  } catch (err) {
    core.setFailed(err.message);
  }
};

// Run the action only when executed as main (not when imported in tests)
// Check if we're running as a GitHub Action (not in test mode)
if (process.env.GITHUB_ACTIONS && !process.env.JEST_WORKER_ID) {
  run(action);
}

export default action;
