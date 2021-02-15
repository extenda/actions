const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./iam-schema');
const { sortAndCompare } = require('../../utils');

const loadFile = (iamFile) => {
  if (!fs.existsSync(iamFile)) {
    throw Error(`iam specification file not found: ${iamFile}`);
  }
  return yaml.parse(fs.readFileSync(iamFile, 'utf8'));
};

const validateAlphaSort = (spec, result) => {
  const {
    services = [],
    permissions = {},
    roles = [],
  } = spec;

  sortAndCompare(services.map((service) => service.name), 'services', result);

  sortAndCompare(Object.keys(permissions), 'permissions', result);
  Object.keys(permissions).forEach((noun) => {
    sortAndCompare(permissions[noun], `permissions.${noun}`, result);
  });

  sortAndCompare(roles.map((role) => role.id), 'roles', result);
  roles.forEach((role, index) => {
    sortAndCompare(role.permissions, `roles[${index}].permissions`, result);
  });
};

const validateSchema = (iamFile, spec) => {
  core.info(`Validate ${iamFile}`);
  const result = validate(spec, jsonSchema);
  validateAlphaSort(spec, result);
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
