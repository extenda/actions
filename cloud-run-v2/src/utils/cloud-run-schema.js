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
    labels: {
      type: 'object',
      properties: {
        component: {
          type: 'string',
          default: 'component-not-set',
          pattern: '^[a-z-]+$',
        },
        product: {
          type: 'string',
          default: 'product-not-set',
          pattern: '^[a-z-]+$',
        },
        'iso-country': {
          type: 'string',
          default: 'global',
          pattern: '^[a-z]+$',
        },
        'tenant-alias': {
          type: 'string',
          default: 'not-tenant-specific',
          pattern: '^[a-z-]+$',
        },
      },
      patternProperties: {
        '^[a-z-]+$': { type: 'string', pattern: '^[a-z-]+$' },
      },
      additionalProperties: false,
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
      minimum: -1,
      maximum: 5,
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
            'vpc-connector': {
              type: 'string',
              default: 'None',
            },
            'vpc-egress': {
              type: 'string',
              default: 'private-ranges-only',
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
            'readiness-type': {
              type: 'string',
              enum: [
                'grpc',
                'http',
              ],
            },
            'readiness-path': {
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
    canary: {
      type: 'object',
      properties: {
        enabled: {
          type: 'boolean',
          default: true,
        },
        steps: {
          type: 'string',
          default: '10,50,80',
        },
        interval: {
          type: 'string',
          default: '10',
        },
        thresholds: {
          type: 'object',
          properties: {
            latency99: {
              type: 'string',
            },
            latency95: {
              type: 'string',
            },
            latency50: {
              type: 'string',
            },
            'error-rate': {
              type: 'string',
            },
          },
          required: [
            'latency99',
            'latency95',
            'latency50',
            'error-rate',
          ],
          additionalProperties: false,
        },
      },
      required: [
        'thresholds',
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
