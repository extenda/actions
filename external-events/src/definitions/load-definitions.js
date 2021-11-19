const yaml = require('js-yaml');
const fg = require('fast-glob');
const { readFileSync } = require('fs');
const core = require('@actions/core');
const { validateExeConfig } = require('./validate-exe-config');

function loadDefinition(path) {
  core.info(`Loading ${path} config file`);
  return yaml.load(readFileSync(path, 'utf-8'), { filename: path });
}

function validateDefs(defs) {
  const errors = Object
    .entries(defs)
    .reduce((acc, [file, config]) => [...acc, ...validateExeConfig(config).map((err) => `${file}:${err}`)], []);
  if (errors.length > 0) {
    errors.forEach((err) => core.error(err));
    throw new Error('Configuration validation failed (see details above).');
  }
}

async function loadDefinitions(glob) {
  core.startGroup('Definitions load');
  core.info(`Loading files by glob - ${glob}`);
  const files = fg.sync([glob], { onlyFiles: true });

  const defs = files.reduce((acc, file) => ({
    ...acc,
    [file]: loadDefinition(file),
  }), {});

  validateDefs(defs);

  core.endGroup();
  return defs;
}

module.exports = { loadDefinitions };
