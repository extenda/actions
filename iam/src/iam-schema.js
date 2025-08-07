module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    'permission-prefix': {
      type: 'string',
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
          'allowed-consumers': {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                clan: {
                  type: 'string',
                },
                'service-accounts': {
                  type: 'array',
                  items: {
                    type: 'string',

                    pattern:
                      '^[A-Za-z0-9_-]+@[A-Za-z0-9_-]+.iam.gserviceaccount.com$',
                  },
                },
              },
              required: ['clan', 'service-accounts'],
            },
          },
        },
        required: ['name', 'repository'],
        additionalProperties: false,
      },
    },
    permissions: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'string',
              pattern: '^[a-z][-a-z]{1,15}$',
            },
            {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  pattern: '^[a-z][-a-z]{1,15}$',
                },
                description: {
                  type: 'string',
                },
                alias: {
                  type: 'string',
                  maxLength: 256,
                },
              },
              required: ['id'],
            },
          ],
        },
      },
      propertyNames: {
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
            pattern: '^[a-z][-a-z]{1,29}$',
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
              pattern:
                '^(?:[a-z][-a-z]{2}\\.)?[a-z][-a-z]{1,15}\\.[a-z][-a-z]{1,15}$',
            },
          },
          'fixed-bindings': {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['id', 'name', 'desc', 'permissions'],
        additionalProperties: false,
      },
    },
  },
  required: ['permission-prefix', 'permissions'],
  additionalProperties: false,
};
