const joi = require('joi');

const schema = joi.object({
  version: joi.number().equal(1),
  'system-prefix': joi.string().regex(/^[a-z0-9]{3}$/).required(),
  'event-sources': joi.array()
    .items(joi.object({
      name: joi.string().regex(/^[a-z][-a-z\d]{0,64}$/).required(),
      version: joi.string().regex(/^v\d{1,10}$/).required(),
      'display-name': joi.string().min(3).max(256).required(),
      'subscription-name': joi.string().regex(/^projects\/[a-z][a-z0-9-]{5,29}\/subscriptions\/[A-Za-z0-9-_.~+%]{3,255}$/).required(),
      'content-type': joi.string().required(),
      schemaUrl: joi.string().uri().required(),
      disabled: joi.boolean().default(false),
      deprecated: joi.object({
        'removal-date': joi.string().isoDate().required(),
        message: joi.string().max(256),
        'replaced-with': joi.string().regex(/^[a-z][-a-z]{2}\.[a-z][-a-z\d]{0,64}\.v\d{1,10}$/),
      }),
    }))
    .required(),
});

/**
 * @return {string[]}
 */

function validateExeConfig(data) {
  const { error } = schema.validate(data, { abortEarly: false });
  if (!error) {
    return [];
  }
  return error.details.map(({ message }) => message);
}

module.exports = { validateExeConfig };
