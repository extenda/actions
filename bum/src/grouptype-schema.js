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
          description: {
            type: 'string',
            maxLength: 200,
          },
        },
        required: [
          'id',
          'name',
          'description',
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
