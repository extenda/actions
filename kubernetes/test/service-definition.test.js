const mockFs = require('mock-fs');
const loadServiceDefinition = require('../../cloud-run/src/service-definition');
const kubernetesSchema = require('../src/kubernetes-schema');

describe('Service Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  describe('Schema validation', () => {
    test('It loads storage object', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
storage:
  volume: 1Gi
  mountPath: /data/storage
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        storage: {
          volume: '1Gi',
          mountPath: '/data/storage',
        },
      });
    });

    test('It succeeds w/out storage object', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject(expect.not.objectContaining({
        storage: expect.anything(),
      }));
    });

    test('It loads cpu and memory definitions', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
requests:
  memory: 128Mi
  cpu: 100m
limits:
  memory: 256Mi
  cpu: 300m
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        requests: {
          cpu: '100m',
          memory: '128Mi',
        },
        limits: {
          cpu: '300m',
          memory: '256Mi',
        },
      });
    });

    test('It loads labels', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
requests:
  memory: 128Mi
  cpu: 100m
limits:
  memory: 256Mi
  cpu: 300m
labels:
  product: testproduct
  component: testcomponent
  random-label-key: random-label-value
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        requests: {
          cpu: '100m',
          memory: '128Mi',
        },
        limits: {
          cpu: '300m',
          memory: '256Mi',
        },
        labels: {
          product: 'testproduct',
          component: 'testcomponent',
          'random-label-key': 'random-label-value',
        },
      });
    });

    test('It does not load faulty labels', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
labels:
  product_1: testproduct
  component: testcomponent
`,
      });
      expect(() => loadServiceDefinition('kubernetes.yaml', kubernetesSchema))
        .toThrow(`kubernetes.yaml is not valid.
0: instance.labels additionalProperty "product_1" exists in instance when not allowed`);
    });

    test('It does not allow wrong pattern in label values', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
labels:
  product: test_product
  component: testcomponent
`,
      });
      expect(() => loadServiceDefinition('kubernetes.yaml', kubernetesSchema))
        .toThrow(`kubernetes.yaml is not valid.
0: instance.labels.product does not match pattern "^[a-z-]+$"`);
    });

    test('It loads ports', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        ports: [
          {
            protocol: 'TCP',
            port: 80,
            targetPort: 8080,
          }],
      });
    });

    test('It loads CPU autoscale config', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
autoscale:
  minReplicas: 1
  maxReplicas: 25
  cpuPercent: 25
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        autoscale: {
          cpuPercent: 25,
          maxReplicas: 25,
          minReplicas: 1,
        },
      });
    });

    test('It loads Pubsub autoscale config', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
autoscale:
  minReplicas: 1
  maxReplicas: 25
  subscriptionName: subscription
  targetAverageUndeliveredMessages: 30
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject({
        autoscale: {
          subscriptionName: 'subscription',
          targetAverageUndeliveredMessages: 30,
          maxReplicas: 25,
          minReplicas: 1,
        },
      });
    });
  });
});
