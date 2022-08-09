module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    'source-language': {
      type: 'string',
      default: 'en',
    },
    'template-id': {
      type: 'integer',
      default: 1,
    },
    'glossary-access': {
      type: 'boolean',
      default: true,
    },
    'target-languages': {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    'translate-duplicates': {
      type: 'integer',
      default: 4,
    },
    repositories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          repo: {
            type: 'string',
          },
          'service-name': {
            type: 'string',
          },
          paths: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
    required: [
      'name',
      'source-language',
      'template-id',
    ],
  },
};
