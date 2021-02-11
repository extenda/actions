module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    repository: {
      type: 'string',
    },
    grouptypes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            minLength: 1,
            maxLength: 20,
            pattern: '^[a-z][-a-z]{1,19}$',
          },
          name: {
            type: 'string',
            maxLength: 50,
          },
          desc: {
            type: 'string',
            maxLength: 200,
          },
        },
        required: [
          'id',
          'name',
          'desc',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'name',
    'repository',
    'grouptypes',
  ],
  additionalProperties: false,
};
