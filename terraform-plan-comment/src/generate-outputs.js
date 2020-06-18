const exec = require('@actions/exec');
const core = require('@actions/core');
const path = require('path');
const fg = require('fast-glob');

const terraformShow = async (plan) => {
  let stdout = '';
  let stderr = '';

  let cwd = path.dirname(plan);

  const terragruntCache = fg.sync(
    `${path.dirname(plan)}/**/.terragrunt-cache/*/*`,
    { dot: true, onlyDirectories: true },
  );
  if (terragruntCache.length > 0) {
    [cwd] = terragruntCache;
  }

  const status = await exec.exec('terraform', ['show', '-no-color', path.relative(cwd, plan)], {
    cwd,
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
  ({ output }) => !output.includes('0 to add, 0 to change, 0 to destroy.')
    && !output.includes('No changes. Infrastructure is up-to-date.'),
);

const filterIgnored = (outputs, ignoredRegexp) => outputs.filter(
  ({ output }) => !(ignoredRegexp && new RegExp(`# ${ignoredRegexp} `).test(output)
    && new RegExp(' (0|1) to add, (0|1) to change, (0|1) to destroy').test(output)),
);

const sortModulePaths = (outputs) => outputs.sort((a, b) => a.module.localeCompare(b.module));

const moduleName = (plan, workingDirectory) => {
  let planDir = plan;

  const terragruntCache = fg.sync(
    `${path.dirname(plan)}/**/.terragrunt-cache`,
    { dot: true, onlyDirectories: true },
  );

  if (terragruntCache.length > 0) {
    [planDir] = terragruntCache;
  }

  const paths = path.relative(workingDirectory, planDir).split(path.sep);
  const index = paths.findIndex((e) => e === '.terragrunt-cache');
  if (index > 0) {
    return paths.slice(0, index).join(path.sep);
  }
  return path.basename(path.dirname(plan));
};

const generateOutputs = async (workingDirectory, planFile, ignoredResourcesRegexp) => {
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
    .then((output) => filterIgnored(output, ignoredResourcesRegexp))
    .then(sortModulePaths)
    .then((changed) => {
      core.info(`Found ${changed.length} plan(s) with changes`);
      return changed;
    });
};

module.exports = generateOutputs;
