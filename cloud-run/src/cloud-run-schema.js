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
    'min-instances': {
      type: 'integer',
      default: -1,
    },
    environment: {
      type: 'object',
    },
    platform: {
      type: 'object',
      properties: {
        managed: {
          type: 'object',
          properties: {
            'allow-unauthenticated': {
              type: 'boolean',
            },
            'cloudsql-instances': {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            cpu: {
              type: 'integer',
              minimum: 1,
              maximum: 2,
            },
            region: {
              type: 'string',
            },
            'service-account': {
              type: 'string',
              default: 'cloudrun-runtime',
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
            'domain-mappings': {
              type: 'object',
              properties: {
                prod: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                staging: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
              additionalProperties: false,
            },
            namespace: {
              type: 'string',
            },
            'opa-enabled': {
              type: 'boolean',
            },
          },
          required: [
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
