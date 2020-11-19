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
cpu: 100m
`,
      });
      const serviceDef = loadServiceDefinition('kubernetes.yaml', kubernetesSchema);
      expect(serviceDef).toMatchObject(expect.not.objectContaining({
        storage: expect.anything(),
      }));
    });

    test('It loads ports', () => {
      mockFs({
        'kubernetes.yaml': `
name: kubernetes
cpu: 100m
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
  });
});
