const fs = require('fs');
const yaml = require('yaml');
const core = require('@actions/core');
const { validate } = require('jsonschema');
const jsonSchema = require('./iam-schema');

const loadFile = (iamFile) => {
  if (!fs.existsSync(iamFile)) {
    throw Error(`iam specification file not found: ${iamFile}`);
  }
  return yaml.parse(fs.readFileSync(iamFile, 'utf8'));
};

const sortAndCompare = (array, docPath, result) => {
  const sorted = array.slice(0).sort((a, b) => {
    const getVerb = (value) => (typeof value === 'string' ? value : value.id);
    return getVerb(a).localeCompare(getVerb(b), 'en-US');
  });
  for (let i = 0; i < array.length; i += 1) {
    if (array[i] !== sorted[i]) {
      const err = result.addError('is not sorted alphabetically');
      err.property = `instance.${docPath}[${i}]`;
    }
  }
};

const validateAlphaSort = (spec, result) => {
  const { services = [], permissions = {}, roles = [] } = spec;

  sortAndCompare(
    services.map((service) => service.name),
    'services',
    result,
  );

  services.forEach((service, serviceIndex) => {
    const allowedConsumers = service['allowed-consumers'];
    if (allowedConsumers) {
      allowedConsumers.forEach((consumerGroup, index) => {
        const serviceAccounts = consumerGroup['service-accounts'];
        sortAndCompare(
          serviceAccounts,
          `services[${serviceIndex}]['allowed-consumers'][${index}]['service-accounts']`,
          result,
        );
      });
    }
  });

  sortAndCompare(Object.keys(permissions), 'permissions', result);
  Object.keys(permissions).forEach((noun) => {
    sortAndCompare(permissions[noun], `permissions.${noun}`, result);
  });

  sortAndCompare(
    roles.map((role) => role.id),
    'roles',
    result,
  );
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
