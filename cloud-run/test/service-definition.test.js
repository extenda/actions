const mockFs = require('mock-fs');
const loadServiceDefinition = require('../src/service-definition');
const cloudRunSchema = require('../src/cloud-run-schema');

describe('Service Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  test('It throws for file not found', () => {
    mockFs({});
    expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
      .toThrow('Service specification file not found: cloud-run.yaml');
  });

  describe('Schema validation', () => {
    test('It throws for missing name', () => {
      mockFs({
        'cloud-run.yaml': `
memory: 256Mi
cpu: 1
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "name"
1: instance requires property "platform"`);
    });

    test('It throws for missing memory', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
cpu: 1
platform:
  managed:
    allow-unauthenticated: true
    region: eu-west1
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "memory"`);
    });

    test('It throws for invalid memory', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
memory: 256m
cpu: 1
platform:
  managed:
    allow-unauthenticated: true
    region: eu-west1
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.memory does not match pattern "^[0-9]+(M|G)i"`);
    });

    test('It throws for missing allow-unauthenticated', () => {
      mockFs({
        'cloud-run.yaml': `
name: service
memory: 1Gi
platform:
  managed:
    region: eu-west1
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.platform.managed requires property "allow-unauthenticated"
`);
    });

    test('It throws for missing platform', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
cpu: 100m
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "platform"
`);
    });

    test('It throws for missing cpu', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance requires property "cpu"
`);
    });

    test('It throws for both platform', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 64Mi
cpu: 300m
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
  gke:
    cluster: test
    connectivity: external
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.platform is not exactly one from "managed","gke"`);
    });

    test('It throws for invalid core count', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
cpu: 3
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.cpu is not exactly one from "millicpu","CPU cores"`);
    });

    test('It throws for invalid millicpu', () => {
      mockFs({
        'cloud-run.yaml': `
name: test-service
memory: 256Mi
cpu: 10000m
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
      });
      expect(() => loadServiceDefinition('cloud-run.yaml', cloudRunSchema))
        .toThrow(`cloud-run.yaml is not valid.
0: instance.cpu is not exactly one from "millicpu","CPU cores"`);
    });
  });


  test('It supports environment variables', () => {
    mockFs({
      'cloud-run.yaml': `
name: service
memory: 256Mi
cpu: 1

environment:
  NAME: value
  SECRET: sm://*/secret-name

platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
`,
    });

    const service = loadServiceDefinition('cloud-run.yaml', cloudRunSchema);
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
cpu: 1
platform:
  managed:
    allow-unauthenticated: true
    region: eu-west1
    cloudsql-instances:
      - Postgres-RANDOM123
`,
    });

    const service = loadServiceDefinition('cloud-run.yaml', cloudRunSchema);
    expect(service.platform.managed['cloudsql-instances']).toEqual(['Postgres-RANDOM123']);
  });

  test('It can process a valid managed definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
concurrency: 20
cpu: 2
max-instances: 3
environment:
  FOO: bar
platform:
  managed:
    region: eu-west1
    allow-unauthenticated: true
    cloudsql-instances:
      - Postgres-RANDOM123
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml', cloudRunSchema);
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      concurrency: 20,
      cpu: 2,
      'max-instances': 3,
      environment: {
        FOO: 'bar',
      },
      platform: {
        managed: {
          region: 'eu-west1',
          'cloudsql-instances': [
            'Postgres-RANDOM123',
          ],
        },
      },
    });
  });

  test('It can process a valid GKE definition', () => {
    mockFs({
      'cloud-run.yaml': `
name: test-service
memory: 256Mi
cpu: 400m
concurrency: 80
max-instances: 20
min-instances: 1
platform:
  gke:
    cluster: test
    connectivity: internal
    domain-mappings:
      staging:
        - test-service.domain.dev
      prod:
        - test-service.domain.com
    opa-enabled: true
`,
    });
    const service = loadServiceDefinition('cloud-run.yaml', cloudRunSchema);
    expect(service).toMatchObject({
      name: 'test-service',
      memory: '256Mi',
      cpu: '400m',
      concurrency: 80,
      'max-instances': 20,
      'min-instances': 1,
      platform: {
        gke: {
          cluster: 'test',
          connectivity: 'internal',
          'opa-enabled': true,
          'domain-mappings': {
            staging: ['test-service.domain.dev'],
            prod: ['test-service.domain.com'],
          },
        },
      },
    });
  });
});
