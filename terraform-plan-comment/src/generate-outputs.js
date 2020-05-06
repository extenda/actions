const exec = require('@actions/exec');
const core = require('@actions/core');
const path = require('path');
const fg = require('fast-glob');

const terraformShow = async (plan) => {
  let stdout = '';
  let stderr = '';
  const status = await exec.exec('terraform', ['show', '-no-color', path.basename(plan)], {
    cwd: path.dirname(plan),
    silent: true,
    listeners: {
      stdout: (data) => {
        stdout += data.toString('utf8');
      },
      stderr: (data) => {
        stderr += data.toString('utf8');
      },
    },
  }).catch((err) => {
    core.error(`${err.message}\nTerraform output:\n${stdout}\n${stderr}`);
    stdout += stderr;
    return 1;
  });
  return {
    status,
    output: stdout.trim(),
  };
};

const filterUnchanged = (outputs) => outputs.filter(
  ({ output }) => !output.includes('0 to add, 0 to change, 0 to destroy.'),
);

const sortModulePaths = (outputs) => outputs.sort((a, b) => a.module.localeCompare(b.module));

const moduleName = (plan, workingDirectory) => {
  const paths = path.relative(workingDirectory, plan).split(path.sep);
  const index = paths.findIndex((e) => e === '.terragrunt-cache');
  if (index > 0) {
    return paths.slice(0, index).join(path.sep);
  }
  return path.dirname(plan);
};

const generateOutputs = async (workingDirectory, planFile) => {
  const source = `${workingDirectory}/**/${planFile}`;
  const plans = fg.sync(source, { dot: true });
  core.info(`Found ${plans.length} plan(s) for glob ${source}`);
  const promises = [];
  plans.forEach((plan) => {
    promises.push(terraformShow(plan).then((output) => ({
      module: moduleName(plan, workingDirectory),
      ...output,
    })));
  });

  return Promise.all(promises)
    .then(filterUnchanged)
    .then(sortModulePaths)
    .then((changed) => {
      core.info(`Found ${changed.length} plan(s) with changes`);
      return changed;
    });
};

module.exports = generateOutputs;
