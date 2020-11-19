module.exports = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
    },
    memory: {
      type: 'string',
      pattern: '^[0-9]+(M|G)i',
      default: '256Mi',
    },
    cpu: {
      type: 'string',
      title: 'millicpu',
      description: 'Kubernetes CPU request in millicpu',
      pattern: '^[0-9]{1,4}m$',
      default: '100m',
    },
    replicas: {
      type: 'integer',
      default: 1,
    },
    ports: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          protocol: {
            type: 'string',
          },
          port: {
            type: 'integer',
          },
          targetPort: {
            type: 'integer',
          },
        },
        additionalProperties: false,
      },
    },
    storage: {
      type: 'object',
      properties: {
        volume: {
          type: 'string',
          pattern: '^[0-9]+(M|G)i',
          default: '1Gi',
        },
        mountPath: {
          type: 'string',
          pattern: '^\\/[\\d\\w\\-_\\/]+$',
          default: '/data/storage',
        },
      },
      additionalProperties: false,
    },
    environment: {
      type: 'object',
    },
  },
  required: [
    'name',
  ],
  additionalProperties: false,
};
