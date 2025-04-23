const joi = require('joi');

const schema = joi.object({
  version: joi.number().equal(1),
  'system-prefix': joi
    .string()
    .regex(/^[a-z0-9]{3}$/)
    .required(),
  definitions: joi
    .array()
    .items(
      joi.object({
        name: joi
          .string()
          .regex(/^[a-z][-a-z\d]{0,64}$/)
          .required(),
        version: joi
          .string()
          .regex(/^(v\d{1,10}|preview)$/)
          .required(),
        'display-name': joi.string().min(3).max(256).required(),
        'schema-location': joi.string().uri().required(),
        'default-value': joi.any().required(),
        'max-tree-depth': joi.string().optional(),
        'enforce-array-item-uniqueness-by-id': joi
          .boolean()
          .default(false)
          .optional(),
      }),
    )
    .required(),
});

/**
 * @return {string[]}
 */

function validateCccConfig(data) {
  const { error } = schema.validate(data, { abortEarly: false });
  if (!error) {
    return [];
  }
  return error.details.map(({ message }) => message);
}

module.exports = { validateCccConfig };
