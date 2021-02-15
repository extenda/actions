const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./grouptype-schema');
const { sortAndCompare } = require('../../utils');

const loadFile = (groupTypeFile) => {
  if (!fs.existsSync(groupTypeFile)) {
    throw Error(`grouptype specification file not found: ${groupTypeFile}`);
  }
  return yaml.parse(fs.readFileSync(groupTypeFile, 'utf8'));
};

const validateAlphaSort = (spec, result) => {
  const {
    grouptypes = [],
  } = spec;

  sortAndCompare(grouptypes.map((groupType) => groupType.id), 'grouptypes', result);
};

const validateSchema = (groupTypeFile, spec) => {
  core.info(`Validate ${groupTypeFile}`);
  const result = validate(spec, jsonSchema);
  validateAlphaSort(spec, result);
  if (!result.valid) {
    const message = `${groupTypeFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadGroupTypeDefinition = (groupTypeFile) => {
  const spec = loadFile(groupTypeFile);
  validateSchema(groupTypeFile, spec);
  return spec;
};

module.exports = loadGroupTypeDefinition;
