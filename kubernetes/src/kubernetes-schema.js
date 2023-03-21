module.exports = {
  type: 'object',
  definitions: {
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
  },
  properties: {
    name: {
      type: 'string',
    },
    requests: {
      type: 'object',
      properties: {
        memory: { $ref: '#/definitions/memory' },
        cpu: { $ref: '#/definitions/cpu' },
      },
      additionalProperties: false,
    },
    limits: {
      type: 'object',
      properties: {
        memory: { $ref: '#/definitions/memory' },
        cpu: { $ref: '#/definitions/cpu' },
      },
      additionalProperties: false,
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
        storageClassName: {
          type: 'string',
          pattern: '^pd\\-+(standard|balanced|sdd|extreme)$',
          default: 'pd-standard',
        },
      },
      additionalProperties: false,
    },
    environment: {
      type: 'object',
    },
    autoscale: {
      type: 'object',
      oneOf: [
        {
          type: 'object',
          properties: {
            minReplicas: {
              type: 'integer',
            },
            maxReplicas: {
              type: 'integer',
            },
            cpuPercent: {
              type: 'integer',
            },
          },
          additionalProperties: false,
        },
        {
          type: 'object',
          properties: {
            minReplicas: {
              type: 'integer',
            },
            maxReplicas: {
              type: 'integer',
            },
            subscriptionName: {
              type: 'string',
            },
            targetAverageUndeliveredMessages: {
              type: 'number',
            },
            required: ['subscriptionName', 'targetAverageUndeliveredMessages'],
          },
          additionalProperties: false,
        },
      ],
    },
  },
  required: [
    'name',
  ],
  additionalProperties: false,
};
