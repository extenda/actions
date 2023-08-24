const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./cloud-deploy.schema.json');

const validateSchema = (serviceFile, spec) => {
  const result = validate(spec, jsonSchema, { nestedErrors: true });
  if (!result.valid) {
    const message = `${serviceFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadServiceDefinition = (serviceFile) => {
  if (!fs.existsSync(serviceFile)) {
    throw Error(`Service specification file not found: ${serviceFile}`);
  }
  const spec = yaml.parse(fs.readFileSync(serviceFile, 'utf8'), { merge: true });
  validateSchema(serviceFile, spec);
  return spec;
};

module.exports = loadServiceDefinition;
