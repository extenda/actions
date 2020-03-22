module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    memory: {
      type: 'string',
    },
    concurrency: {
      type: 'integer',
      default: -1,
    },
    'max-instances': {
      type: 'integer',
      default: -1,
    },
    environment: {
      type: 'object',
    },
    'cloudsql-instances': {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    platform: {
      type: 'object',
      properties: {
        managed: {
          type: 'object',
          properties: {
            region: {
              type: 'string',
            },
            cpu: {
              type: 'integer',
              minimum: 1,
              maximum: 2,
            },
            'allow-unauthenticated': {
              type: 'boolean',
            },
          },
          required: [
            'region',
            'allow-unauthenticated',
          ],
          additionalProperties: false,
        },
        gke: {
          type: 'object',
          properties: {
            cluster: {
              type: 'string',
            },
            'cluster-location': {
              type: 'string',
            },
            connectivity: {
              type: 'string',
              enum: [
                'external',
                'internal',
              ],
            },
            cpu: {
              type: 'string',
            },
            namespace: {
              type: 'string',
            },
          },
          required: [
            'cluster',
            'cluster-location',
            'connectivity',
          ],
          additionalProperties: false,
        },
      },
      oneOf: [
        { required: ['managed'] },
        { required: ['gke'] },
      ],
      additionalProperties: false,
    },
  },
  required: [
    'name',
    'memory',
    'platform',
  ],
  additionalProperties: false,
};
