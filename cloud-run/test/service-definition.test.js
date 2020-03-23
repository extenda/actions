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
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "name"
1: instance requires property "platform"`);
    });

    test('It throws for missing memory', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "memory"`);
    });

    test('It throws for missing allow-unauthenticated', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
memory: 256Mi
platform:
  managed:
    region: eu-west1
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.platform.managed requires property "allow-unauthenticated"
`);
    });

    test('It throws for missing platform', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "platform"
`);
    });

    test('It throws for both platform', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
  gke:
    cluster: test
    cluster-location: eu-west1-b
    connectivity: external
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml'))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.platform is not exactly one from [subschema 0],[subschema 1]`);
    });
  });


  test('It supports environment variables', () => {
    mockFs({
      'cloud-run.yaml': `
name: service
memory: 256Mi

environment:
  NAME: value
  SECRET: sm://*/secret-name

platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
    });

    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service.environment).toMatchObject({
      NAME: 'value',
      SECRET: 'sm://*/secret-name',
    });
  });

  test('It supports cloudsql-instances', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
cloudsql-instances:
  - Postgres-RANDOM123
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
    });

    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service['cloudsql-instances']).toEqual(['Postgres-RANDOM123']);
  });

  test('It can process a valid managed definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
concurrency: 20
max-instances: 3
environment:
  FOO: bar
cloudsql-instances:
  - Postgres-RANDOM123
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
    cpu: 2
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      concurrency: 20,
      'max-instances': 3,
      environment: {
        FOO: 'bar',
      },
      'cloudsql-instances': [
        'Postgres-RANDOM123',
      ],
      platform: {
        managed: {
          region: 'eu-west1',
          cpu: 2,
        },
      },
    });
  });

  test('It can process a valid GKE definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
concurrency: 80
max-instances: 20
platform:
  gke:
    cluster: test
    cluster-location: eu-west1-b
    connectivity: internal
    cpu: 400m
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml');
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      concurrency: 80,
      'max-instances': 20,
      platform: {
        gke: {
          cluster: 'test',
          'cluster-location': 'eu-west1-b',
          connectivity: 'internal',
          cpu: '400m',
        },
      },
    });
  });
});
