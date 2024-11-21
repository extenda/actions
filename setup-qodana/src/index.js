const core = require('@actions/core');
const { run } = require('../../utils');
const createProject = require('./create-project');
const coverageDirectory = require('./coverage-dir');
const findBaseline = require('./baseline');
const qodanaSanity = require('./qodana-sanity');
const { autoDiscover } = require('./auto-discover');
const fs = require('fs');
const path = require('path');

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
    core.info('qodana.yaml is valid');
  }

  const projectToken = await createProject(qodanaToken, qodanaTeam);
  core.setSecret(projectToken);
  core.setOutput('project-token', projectToken);

  const args = [];

  if (projectDirectory !== '.') {
    args.push('--project-dir', projectDirectory);
  }

  args.push('--config', qodanaYamlFile);

  const baseline = findBaseline(projectDirectory);
  if (baseline) {
    core.setOutput('baseline', baseline);
    args.push('--baseline', baseline);
  }

  const coverageDir = coverageDirectory(projectType, projectDirectory);
  if (coverageDir) {
    core.setOutput('coverage-dir', coverageDir);
    args.push('--coverage-dir', coverageDir);
  }

  core.setOutput('args', args.join(','));

  core.info(require('path').resolve(projectDirectory));
};

if (require.main === module) {
  run(action);
}

module.exports = action;
