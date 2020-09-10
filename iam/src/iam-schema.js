module.exports = {
  type: 'object',
  properties: {
    'permission-prefix': {
      type: 'string',
    },
    systems: {
      type: 'array',
      properties: {
        namespace: {
          type: 'string',
        },
        repository: {
          type: 'string',
        },
      },
    },
    permissions: {
      type: 'object',
    },
    roles: {
      type: 'array',
      properties: {
        name: {
          type: 'string',
        },
        desc: {
          type: 'string',
        },
        permissions: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
  required: [
    'permission-prefix',
    'systems',
    'permissions',
  ],
  additionalProperties: false,
};
