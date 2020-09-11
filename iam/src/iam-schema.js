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
      required: [
        'namespace',
        'repository',
      ],
      additionalProperties: false,
    },
    permissions: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        additionalProperties: {
          type: 'string',
        },
      },
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
      required: [
        'name',
        'desc',
        'permissions',
      ],
      additionalProperties: false,
    },
  },
  required: [
    'permission-prefix',
    'systems',
    'permissions',
  ],
  additionalProperties: false,
};
