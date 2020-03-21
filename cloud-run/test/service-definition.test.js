const mockFs = require('mock-fs');
const loadServiceDefinition = require('../src/service-definition');

describe('Service Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  test('It throws for file not found', () => {
    mockFs({});
    expect(() => loadServiceDefinition('cloud-run.yaml'))
      .toThrow('Service specification file not found: cloud-run.yaml');
  });

  describe('Schema validation', () => {
    test('It throws for missing name', () => {
      mockFs({
        'cloud-run.yaml': `
memory: 256Mi
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow('Missing required property: name');
    });

    test('It throws for missing memory', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow('Missing required property: memory');
    });

    test('It throws for missing allow-unauthenticated', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
memory: 256Mi
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow('Missing required property: allow-unauthenticated');
    });

    test('It throws for missing runs-on', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow('Missing required property: runs-on');
    });

    test('It throws for double runs-on', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
allow-unauthenticated: true
runs-on:
  managed:
    region: eu-west1
  gke:
    cluster: test
    cluster-location: eu-west1-b
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow('Invalid runs-on block, must contain either managed or gke property');
    });
  });

  test('It can process a valid managed definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
allow-unauthenticated: true
runs-on:
  managed:
    region: eu-west1
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      allowUnauthenticated: true,
      runsOn: {
        platform: 'managed',
        region: 'eu-west1',
      },
    });
  });

  test('It can process a valid GKE definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
allow-unauthenticated: false
runs-on:
  gke:
    cluster: test
    cluster-location: eu-west1-b
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      allowUnauthenticated: false,
      runsOn: {
        platform: 'gke',
        cluster: 'test',
        clusterLocation: 'eu-west1-b',
      },
    });
  });
});
