const core = require('@actions/core');
const github = require('@actions/github');
const { checkEnv, run } = require('../../utils');
const versions = require('../../utils/src/versions');

const createGitHubRelease = async (release, name) => {
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);
  const { owner, repo } = github.context.repo;
  const response = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: release.tagName,
    name: name === 'v' ? name + release.version : `${name} ${release.version}`,
    body: release.changelog,
  });

  const { data } = response;
  core.info(`Created GitHub release ${data.html_url}`);
};

const action = async () => {
  try {
    const tagPrefix = core.getInput('tag-prefix', { required: true });
    const name = core.getInput('name') || 'Release';

    checkEnv(['GITHUB_TOKEN']);

    versions.setTagPrefix(tagPrefix);
    const release = await versions.tagReleaseVersion();

    await createGitHubRelease(release, name);

    core.info(`Created release tag ${release.tagName}`);

    core.setOutput('version', release.version);
    core.setOutput('release-tag', `${release.tagName}`);
    core.setOutput('release-changelog', `${release.changelog}`);
  } catch (err) {
    core.setFailed(err.message);
  }
};

if (require.main === module) {
  run(action);
}

module.exports = action;
