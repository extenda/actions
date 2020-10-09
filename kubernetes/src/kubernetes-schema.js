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
    environment: {
      type: 'object',
    },
  },
  required: [
    'name',
  ],
  additionalProperties: false,
};
