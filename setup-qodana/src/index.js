const core = require('@actions/core');
const path = require('path');
const { run } = require('../../utils');
const createProject = require('./create-project');
const coverageDirectory = require('./coverage-dir');
const findBaseline = require('./baseline');
const qodanaSanity = require('./qodana-sanity');
const { autoDiscover } = require('./auto-discover');
const github = require('./github');

const action = async () => {
  const qodanaToken = core.getInput('qodana-token', { required: true });
  const qodanaTeam = core.getInput('qodana-team', { required: true });
  const projectDirectory = core.getInput('project-directory') || '.';

  const projectType = autoDiscover(projectDirectory);

  const { qodanaYamlFile, valid } = qodanaSanity(projectType, projectDirectory);

  if (!valid) {
    core.setFailed('qodana.yaml failed sanity checks');
    return;
  } else {
    core.info('⭐️ qodana.yaml is valid');
  }

  const projectToken = await createProject(qodanaToken, qodanaTeam);
  core.setSecret(projectToken);
  core.setOutput('project-token', projectToken);

  const args = [];

  if (projectDirectory !== '.') {
    args.push('--project-dir', projectDirectory);
  }

  args.push('--config', path.relative(process.cwd(), qodanaYamlFile));

  const baseline = await findBaseline(projectDirectory);
  if (baseline) {
    core.setOutput('baseline', baseline);
    args.push('--baseline', baseline);
  }

  const coverageDir = coverageDirectory(projectType, projectDirectory);
  if (coverageDir) {
    core.setOutput('coverage-dir', coverageDir);
    args.push('--coverage-dir', coverageDir);
  }

  const octokit = github.getOctokit();
  const { sha, prMode, issueNumber } = await github.getQodanaPrSha(octokit);
  core.setOutput('pr-mode', `${prMode}`);
  if (sha) {
    core.info(
      `⚡️Use Qodana pr-mode with sha ${sha}${issueNumber > 0 ? `and issue number ${issueNumber}` : ''}`,
    );
    core.exportVariable('QODANA_PR_SHA', sha);
  }
  if (issueNumber > 0) {
    core.exportVariable('QODANA_ISSUE_NUMBER', issueNumber);
  }

  core.setOutput('args', args.join(','));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
