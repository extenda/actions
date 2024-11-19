const core = require('@actions/core');
const path = require('path');
const fs = require('fs');
const { run } = require('../../utils');
const { GENERATED_QODANA_YAML } = require('./constants');
const github = require('./github');

const post = async () => {
  const status = core.getInput('job-status');
  const generated = core.getState(GENERATED_QODANA_YAML);

  const octokit = github.getOctokit();
  const pullRequest = await github.getPullRequest(octokit);
  if (generated && pullRequest) {
    const files = [];
    core.info('Add default qodana.yaml configuration.');
    files.push({
      path: 'qodana.yaml',
      content: fs.readFileSync(generated, 'base64'),
    });
    if (status !== 'success') {
      const baseline = path.resolve(
        path.dirname(generated),
        'qodana.sarif.json',
      );
      if (fs.existsSync(baseline)) {
        core.info('Add initial qodana.sarif.json baseline');
        files.push({
          path: 'qodana.sarif.json',
          content: fs.readFileSync(baseline, 'base64'),
        });
      }
    }
    return github
      .commitFiles(octokit, pullRequest, files)
      .then(() => {
        core.info(
          `Pushed initial qodana configuration to ${pullRequest.head.ref}`,
        );
        return 0;
      })
      .catch((err) => {
        core.error(`Failed to commit files.\n${err.message}`);
        return 1;
      });
  }
  return 0;
};

if (require.main === module) {
  run(post);
}

module.exports = post;
