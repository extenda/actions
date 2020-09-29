module.exports = {
  type: 'object',
  properties: {
    concurrency: {
      type: 'integer',
      default: -1,
    },
    cpu: {
      oneOf: [
        {
          type: 'string',
          title: 'millicpu',
          description: 'Kubernetes CPU request in millicpu',
          pattern: '^[0-9]{1,4}m$',
        },
        {
          type: 'integer',
          title: 'CPU cores',
          description: 'CPU cores for managed cloud run',
          minimum: 1,
          maximum: 2,
        },
      ],
      default: '200m',
    },
    'enable-http2': {
      type: 'boolean',
      default: false,
    },
    name: {
      type: 'string',
    },
    'max-instances': {
      type: 'integer',
      default: -1,
    },
    'max-revisions': {
      type: 'integer',
      default: 4,
    },
    memory: {
      type: 'string',
      pattern: '^[0-9]+(M|G)i',
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
        {
          title: 'managed',
          required: ['managed'],
        },
        {
          title: 'gke',
          required: ['gke'],
        },
      ],
      additionalProperties: false,
    },
  },
  required: [
    'cpu',
    'name',
    'memory',
    'platform',
  ],
  additionalProperties: false,
};
