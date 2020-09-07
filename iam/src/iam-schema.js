module.exports = {
  type: 'object',
  properties: {
    system: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          required: true,
        },
        name: {
          type: 'string',
          required: true,
        },
      },
    },
    permissions: {
      type: 'object',
    },
    roles: {
      type: 'array',
      items: {
        properties: {
          name: {
            type: 'string',
          },
          desc: {
            type: 'string',
            maxLength: 20,
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
  },
  required: [
    'system',
    'permissions',
  ],
  additionalProperties: false,
};
