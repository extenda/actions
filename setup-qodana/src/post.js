const core = require('@actions/core');
const path = require('path');
const fs = require('fs');
const { run } = require('../../utils');
const { GENERATED_QODANA_YAML } = require('./constants');
const github = require('./github');

const post = async () => {
  const generated = core.getState(GENERATED_QODANA_YAML);

  const octokit = github.getOctokit();

  const qodanaFailure = await github
    .getQodanaChecks(octokit)
    .then((checks) => checks.some((check) => !check.success));

  core.info(
    `Post process Qodana with conclusion: ${qodanaFailure ? 'failure' : 'success'}`,
  );

  const isFeatureBranch = await github.isFeatureBranch(octokit);
  if (generated && !isFeatureBranch) {
    core.warning(`Qodana configuration does not exist.
    💡Run the quality gate in a feature branch or pull request to auto-configure Qodana.`);
  } else if (generated) {
    const files = [];
    core.info('Add default qodana.yaml configuration.');
    files.push({
      path: 'qodana.yaml',
      content: fs.readFileSync(generated, 'base64'),
    });

    if (qodanaFailure) {
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
      .commitFiles(octokit, files)
      .then(() => {
        core.info(
          `Pushed initial qodana configuration to ${github.getCurrentBranch()}`,
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
