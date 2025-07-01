const fs = require('fs');
const core = require('@actions/core');
const yaml = require('yaml');
const { validate } = require('jsonschema');

const DEFAULT_CACHE_KEYS_FILE =
  'policies/policy/com.styra.envoy.ingress/rules/rules/cache-keys.yaml';

const CACHE_KEYS_SCHEMA = {
  $id: 'cache-keys.schema.json',
  title: 'Cache Keys',
  type: 'array',
  items: {
    title: 'CacheKeyAlias',
    type: 'object',
    required: ['method', 'path'],
    properties: {
      method: {
        type: 'string',
        description: 'The HTTP verb',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
      },
      path: {
        type: 'string',
        description:
          "'The request path with '*' for parameters unused by policy and '{name}' for used parameters.",
      },
      query: {
        type: 'object',
        title: 'QueryParams',
        description:
          "The query string parameters with '*' for parameters unused by policy and '{name}' for used parameters.",
        patternProperties: {
          '.+': {
            type: 'string',
          },
        },
      },
      additionalProperties: false,
    },
  },
};

const loadCacheKeys = (cacheKeysYamlFile = DEFAULT_CACHE_KEYS_FILE) => {
  if (fs.existsSync(cacheKeysYamlFile)) {
    const cacheKeys = yaml.parse(fs.readFileSync(cacheKeysYamlFile, 'utf8'));
    core.info(
      `Found security-authz cache keys:\n${JSON.stringify(cacheKeys, null, 2)}`,
    );
    const result = validate(cacheKeys, CACHE_KEYS_SCHEMA);
    if (!result.valid) {
      const message = `${cacheKeysYamlFile} is not valid.\n${result.toString()}`;
      core.error(message);
      throw new Error(message);
    }
    return cacheKeys;
  }
  return undefined;
};

module.exports = {
  loadCacheKeys,
};
