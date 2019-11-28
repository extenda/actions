const core = require('@actions/core');
const { context, GitHub } = require('@actions/github');
const { checkEnv } = require('../../utils');
const versions = require('../../utils/src/versions');

const createGitHubRelease = async (release) => {
  const github = new GitHub(process.env.GITHUB_TOKEN);
  const { owner, repo } = context.repo;

  const response = await github.repos.createRelease({
    owner,
    repo,
    tag_name: release.tagName,
    name: `Release ${release.version}`,
    body: release.changelog,
  });

  const { data } = response;
  core.info(`Created GitHub release ${data.html_url}`);
};

const run = async () => {
  try {
    const tagPrefix = core.getInput('tag-prefix', { required: true });

    checkEnv(['GITHUB_TOKEN']);

    versions.tagPrefix = tagPrefix;
    const release = await versions.tagReleaseVersion();

    await createGitHubRelease(release);

    core.info(`Created release tag ${release.tagName}`);

    core.setOutput('version', release.version);
    core.setOutput('release-tag', `${release.tagName}`);
  } catch (err) {
    core.setFailed(err.message);
  }
};

run();
