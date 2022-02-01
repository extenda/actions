const yaml = require('js-yaml');
const fg = require('fast-glob');
const { readFileSync } = require('fs');
const core = require('@actions/core');
const jsYaml = require('js-yaml');
const { validateExeConfig } = require('./validate-exe-config');

function loadDefinition(path) {
  core.info(`Loading ${path} config file`);
  return yaml.load(readFileSync(path, 'utf-8'), { filename: path, schema: jsYaml.FAILSAFE_SCHEMA });
}

function validateSystemPrefixUnique(defs) {
  // all files where systemPrefix duplicates
  const duplicates = defs.reduce((acc, [file, config], idx) => {
    if (defs.some(([, _config], _idx) => _config['system-prefix'] === config['system-prefix'] && _idx !== idx)) {
      if (!acc[config['system-prefix']]) {
        acc[config['system-prefix']] = [];
      }
      acc[config['system-prefix']].push(file);
    }
    return acc;
  }, {});
  return Object
    .entries(duplicates)
    .map(([system, files]) => `system-prefix ${system} is duplicated in files [${files}]`);
}

function validateDefsSchema(defs) {
  const validateDef = (file, config) => validateExeConfig(config).map((err) => `${file}:${err}`);
  return defs.reduce((acc, [file, config]) => [...acc, ...validateDef(file, config)], []);
}

function validateDefs(defs) {
  const errors = [];

  const defsEntries = Object.entries(defs);

  errors.push(...validateSystemPrefixUnique(defsEntries));
  errors.push(...validateDefsSchema(defsEntries));

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
