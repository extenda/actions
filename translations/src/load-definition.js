const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./spec-schema');

const loadFile = (crowdinFile) => {
  if (!fs.existsSync(crowdinFile)) {
    throw Error(`Configuration file not found: ${crowdinFile}`);
  }
  return yaml.parse(fs.readFileSync(crowdinFile, 'utf8'));
};

const validateSchema = (crowdinFile, spec) => {
  core.info(`Validate ${crowdinFile}`);
  const result = validate(spec, jsonSchema);

  if (!result.valid) {
    const message = `${crowdinFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadSpecDefinition = (crowdinFile) => {
  const spec = loadFile(crowdinFile);
  validateSchema(crowdinFile, spec);
  return spec;
};

module.exports = loadSpecDefinition;
