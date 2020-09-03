module.exports = {
  type: 'object',
  properties: {
    system: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
        },
        desc: {
          type: 'string',
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
