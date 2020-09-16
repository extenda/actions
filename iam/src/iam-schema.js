module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    'permission-prefix': {
      type: 'string',
      maxLength: 3,
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
        additionalProperties: {
          type: 'string',
          maxLength: 16,
        },
      },
    },
    roles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
          },
          desc: {
            type: 'string',
            maxLength: 20,
          },
          name: {
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
