import fs from 'node:fs';

import * as core from '@actions/core';
import merge from 'deepmerge';
import { validate } from 'jsonschema';
import yaml from 'yaml';

const loadFile = (serviceFile) => {
  if (!fs.existsSync(serviceFile)) {
    throw Error(`Service specification file not found: ${serviceFile}`);
  }
  return yaml.parse(fs.readFileSync(serviceFile, 'utf8'));
};

const validateSchema = (serviceFile, spec, schema) => {
  const result = validate(spec, schema);
  if (!result.valid) {
    const message = `${serviceFile} is not valid.\n${result.toString()}`;
    core.error(message);
    throw new Error(message);
  }
};

const loadServiceDefinition = (serviceFile, schema, patch) => {
  let spec = loadFile(serviceFile);
  if (patch) {
    const patchSpec = yaml.parse(patch);
    spec = merge(spec, patchSpec, {
      arrayMerge: (specArray, patchArray) => patchArray,
    });
  }

  validateSchema(serviceFile, spec, schema);
  return spec;
};

export default loadServiceDefinition;
