import * as core from '@actions/core';
import fs from 'fs';
import { validate } from 'jsonschema';
import yaml from 'yaml';

import jsonSchema from './cloud-deploy.schema.json';

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
  core.info(`Load service specification from ${serviceFile}`);
  const spec = yaml.parse(fs.readFileSync(serviceFile, 'utf8'), {
    merge: true,
  });
  validateSchema(serviceFile, spec);
  return spec;
};

export default loadServiceDefinition;
