const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./iam-schema');

const loadFile = (serviceFile) => {
  if (!fs.existsSync(serviceFile)) {
    throw Error(`Service specification file not found: ${serviceFile}`);
  }
  return yaml.parse(fs.readFileSync(serviceFile, 'utf8'));
};

const validateSchema = (serviceFile, spec) => {
  const result = validate(spec, jsonSchema);
  if (!result.valid) {
    const message = `${serviceFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadIamDefinition = (serviceFile) => {
  const spec = loadFile(serviceFile);
  validateSchema(serviceFile, spec);
  return spec;
};

module.exports = loadIamDefinition;