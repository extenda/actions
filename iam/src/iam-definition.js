const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./iam-schema');

const loadFile = (iamFile) => {
  if (!fs.existsSync(iamFile)) {
    throw Error(`Service specification file not found: ${iamFile}`);
  }
  return yaml.parse(fs.readFileSync(iamFile, 'utf8'));
};

const validateSchema = (iamFile, spec) => {
  const result = validate(spec, jsonSchema);
  if (!result.valid) {
    const message = `${iamFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadIamDefinition = (iamFile) => {
  const spec = loadFile(iamFile);
  validateSchema(iamFile, spec);
  return spec;
};

module.exports = loadIamDefinition;
