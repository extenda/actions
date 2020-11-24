module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    'permission-prefix': {
      type: 'string',
      minLength: 3,
      maxLength: 3,
      pattern: '^[a-z][-a-z]{2}$',
    },
    services: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          repository: {
            type: 'string',
          },
        },
        required: [
          'name',
          'repository',
        ],
        additionalProperties: false,
      },
    },
    permissions: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'string',
          minLength: 1,
          maxLength: 16,
          pattern: '^[a-z][-a-z]{1,15}$',
        },
      },
      propertyNames: {
        minLength: 1,
        maxLength: 16,
        pattern: '^[a-z][-a-z]{1,15}$',
      },
    },
    roles: {
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
          desc: {
            type: 'string',
            maxLength: 200,
          },
          name: {
            type: 'string',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
              pattern: '^[a-z][-a-z]{1,15}\\.[a-z][-a-z]{1,15}$',
            },
          },
        },
        required: [
          'id',
          'name',
          'desc',
          'permissions',
        ],
        additionalProperties: false,
      },
    },
  },
  required: [
    'permission-prefix',
    'services',
    'permissions',
  ],
  additionalProperties: false,
};
