import mockFs from 'mock-fs';
import { afterEach, describe, expect, test } from 'vitest';

import loadServiceDefinition from '../../src/utils/service-definition.js';

describe('Service Definition', () => {
  afterEach(() => {
    mockFs.restore();
  });

  test('It can parse a valid cloud run service', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: false

labels:
  component: jest
  product: my-product
  foo: bar

security:
  permission-prefix: mye

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
      KEY2: value2
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
      },
      security: {
        'permission-prefix': 'mye',
      },
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
        },
        staging: {
          env: {
            KEY: 'value',
            KEY2: 'value2',
          },
        },
      },
    });
  });

  test('It can parse a valid cloud run with cloud armor and permission-prefix', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: false

labels:
  component: jest
  product: my-product
  foo: bar

security:
  permission-prefix: mye
  system-name: test-123
  cloud-armor:
    policy-name: policy

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
      KEY2: value2
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
      },
      security: {
        'permission-prefix': 'mye',
        'cloud-armor': {
          'policy-name': 'policy',
        },
      },
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
        },
        staging: {
          env: {
            KEY: 'value',
            KEY2: 'value2',
          },
        },
      },
    });
  });

  test('It can parse a valid cloud run with consumers and cloud-armor', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: false

labels:
  component: jest
  product: my-product
  foo: bar

security:
  consumers:
   service-accounts:
     - test@extenda.com
  cloud-armor:
    policy-name: policy

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
      KEY2: value2
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
      },
      security: {
        'cloud-armor': {
          'policy-name': 'policy',
        },
        consumers: {
          'service-accounts': ['test@extenda.com'],
        },
      },
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
        },
        staging: {
          env: {
            KEY: 'value',
            KEY2: 'value2',
          },
        },
      },
    });
  });

  test('It can parse a valid cloud run with cloud-armor', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: false

labels:
  component: jest
  product: my-product
  foo: bar

security:
  cloud-armor:
    policy-name: policy

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      - my-service.retailsvc.dev
    env:
      <<: *env
      KEY2: value2
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
      },
      security: {
        'cloud-armor': {
          'policy-name': 'policy',
        },
      },
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
        },
        staging: {
          env: {
            KEY: 'value',
            KEY2: 'value2',
          },
        },
      },
    });
  });

  test('It can parse a Kubernetes deployment', async () => {
    mockFs({
      'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  monitoring:
    prometheus:
      interval: 30
      path: /test

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging: none
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      kubernetes: {
        service: 'my-service',
        type: 'Deployment',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        monitoring: {
          prometheus: {
            interval: 30,
            path: '/test',
          },
        },
      },
      security: 'none',
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
        },
      },
    });
  });

  test('It can parse pathmappings', async () => {
    mockFs({
      'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
  monitoring:
    prometheus:
      interval: 30
      path: /test

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    path-mappings:
      - paths:
        - /test/*
        - /api/v1/test/*
        service: test-service
      - paths:
        - /api/v1/*
        bucket: test-bucket
        path-rewrite: /
    env: &env
      KEY: value
  staging: none
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      kubernetes: {
        service: 'my-service',
        type: 'Deployment',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        monitoring: {
          prometheus: {
            interval: 30,
            path: '/test',
          },
        },
      },
      security: 'none',
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
          'path-mappings': [
            {
              paths: ['/test/*', '/api/v1/test/*'],
              service: 'test-service',
            },
            {
              paths: ['/api/v1/*'],
              bucket: 'test-bucket',
              'path-rewrite': '/',
            },
          ],
        },
      },
    });
  });
  test('It can read traffic variables', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    serve-traffic: true
    static-egress-ip: false
    direct-vpc-connection: false

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    path-mappings:
      - paths:
        - /test/*
        - /api/v1/test/*
        service: test-service
      - paths:
        - /api/v1/*
        bucket: test-bucket
        path-rewrite: /
    env: &env
      KEY: value
  staging: none
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        traffic: {
          'serve-traffic': true,
          'static-egress-ip': false,
          'direct-vpc-connection': false,
        },
      },
      security: 'none',
      environments: {
        production: {
          'min-instances': 1,
          'domain-mappings': [
            'my-service.retailsvc.com',
            'my-service.retailsvc-test.com',
          ],
          'path-mappings': [
            {
              paths: ['/test/*', '/api/v1/test/*'],
              service: 'test-service',
            },
            {
              paths: ['/api/v1/*'],
              bucket: 'test-bucket',
              'path-rewrite': '/',
            },
          ],
        },
      },
    });
  });
  test('It can read default monitoring config', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  monitoring:
    prometheus:
      interval: 60
    open-telemetry:
      config: auto
  traffic:
    static-egress-ip: false

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
      - my-service.retailsvc-test.com
    env: &env
      KEY: value
  staging: none
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        monitoring: {
          prometheus: {
            interval: 60,
          },
          'open-telemetry': {},
        },
      },
      security: 'none',
    });
  });

  test('It can parse additional CORS configuration', async () => {
    mockFs({
      'cloud-deploy.yaml': `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: false

labels:
  component: jest
  product: my-product
  foo: bar

security:
  permission-prefix: mye
  cors:
    enabled: true
    additional-allow-headers:
      - Business-Unit-Id

environments:
  production:
    min-instances: 1
    env: {}
  staging:
    min-instances: 0
    env: {}
      `,
    });

    const spec = loadServiceDefinition('cloud-deploy.yaml');
    expect(spec).toMatchObject({
      'cloud-run': {
        service: 'my-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
      },
      security: {
        'permission-prefix': 'mye',
        cors: {
          enabled: true,
          'additional-allow-headers': ['Business-Unit-Id'],
        },
      },
    });
  });

  describe('traffic.canary configuration', () => {
    const baseYaml = (trafficBlock) => `
cloud-run:
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    concurrency: 80
  traffic:
    static-egress-ip: true
    ${trafficBlock}

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
    domain-mappings:
      - my-service.retailsvc.com
    env: {}
  staging:
    min-instances: 0
    domain-mappings:
      - my-service.retailsvc.dev
    env: {}
    `;

    test('It accepts canary: enabled (string form)', () => {
      mockFs({ 'cloud-deploy.yaml': baseYaml('canary: enabled') });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec['cloud-run'].traffic.canary).toBe('enabled');
    });

    test('It accepts canary as object with steps', () => {
      mockFs({
        'cloud-deploy.yaml': baseYaml(`canary:
      steps:
        - 5
        - 10
        - 25
        - 50
        - 75`),
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec['cloud-run'].traffic.canary).toEqual({
        steps: [5, 10, 25, 50, 75],
      });
    });

    test('It accepts canary as object with steps and slack-channel', () => {
      mockFs({
        'cloud-deploy.yaml': baseYaml(`canary:
      steps:
        - 10
        - 50
      slack-channel: '#deployments'`),
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec['cloud-run'].traffic.canary).toEqual({
        steps: [10, 50],
        'slack-channel': '#deployments',
      });
    });

    test('It accepts canary as empty object (uses action defaults for steps)', () => {
      mockFs({ 'cloud-deploy.yaml': baseYaml('canary: {}') });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec['cloud-run'].traffic.canary).toEqual({});
    });

    test('It rejects canary with unknown properties', () => {
      mockFs({
        'cloud-deploy.yaml': baseYaml(`canary:
      steps:
        - 10
      unknown-prop: foo`),
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });
  });

  describe('Vertical Scaling Configuration', () => {
    test('It can parse valid vertical scaling configuration with all properties', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 80
      kafka-lag-threshold: 100000
      increments-cpu: 1.5
      max-cpu: 5
      max-memory: 8Gi
      scale-up-interval: 10
      scale-up-threshold: 3

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec).toMatchObject({
        kubernetes: {
          service: 'my-service',
          type: 'Deployment',
          scaling: {
            cpu: 50,
            vertical: {
              threshold: 80,
              'kafka-lag-threshold': 100000,
              'increments-cpu': 1.5,
              'max-cpu': 5,
              'max-memory': '8Gi',
              'scale-up-interval': 10,
              'scale-up-threshold': 3,
            },
          },
        },
      });
    });

    test('It can parse vertical scaling with minimal configuration', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 0.5
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec).toMatchObject({
        kubernetes: {
          service: 'my-service',
          type: 'Deployment',
          scaling: {
            cpu: 50,
            vertical: {
              threshold: 50,
              'increments-cpu': 0.5,
              'max-cpu': 4,
            },
          },
        },
      });
    });

    test('It rejects threshold below minimum (10)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 5
      increments-cpu: 1
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects threshold above maximum (100)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 101
      increments-cpu: 1
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects negative kafka-lag-threshold', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      kafka-lag-threshold: -100
      increments-cpu: 1
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects increments-cpu below minimum (0.5)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 0.25
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects increments-cpu above maximum (8)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 10
      max-cpu: 4

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects max-cpu below minimum (0.25)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 0.1

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects max-cpu above maximum (10)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 12

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects invalid max-memory format', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      max-memory: 8G

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It accepts valid max-memory formats (Mi and Gi)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      max-memory: 2048Mi

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec.kubernetes.scaling.vertical['max-memory']).toBe('2048Mi');
    });

    test('It rejects scale-up-interval below minimum (1)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      scale-up-interval: 0

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects scale-up-interval above maximum (15)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      scale-up-interval: 20

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects scale-up-threshold below minimum (1)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      scale-up-threshold: 0

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It rejects scale-up-threshold above maximum (10)', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 50
      increments-cpu: 1
      max-cpu: 4
      scale-up-threshold: 15

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      expect(() => loadServiceDefinition('cloud-deploy.yaml')).toThrow();
    });

    test('It accepts boundary values for all vertical scaling properties', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 10
      kafka-lag-threshold: 0
      increments-cpu: 0.5
      max-cpu: 0.25
      max-memory: 1Mi
      scale-up-interval: 1
      scale-up-threshold: 1

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec).toMatchObject({
        kubernetes: {
          scaling: {
            vertical: {
              threshold: 10,
              'kafka-lag-threshold': 0,
              'increments-cpu': 0.5,
              'max-cpu': 0.25,
              'max-memory': '1Mi',
              'scale-up-interval': 1,
              'scale-up-threshold': 1,
            },
          },
        },
      });
    });

    test('It accepts maximum boundary values for all vertical scaling properties', async () => {
      mockFs({
        'cloud-deploy.yaml': `
kubernetes:
  type: Deployment
  service: my-service
  resources:
    cpu: 1
    memory: 512Mi
  protocol: http
  scaling:
    cpu: 50
    vertical:
      threshold: 100
      kafka-lag-threshold: 999999
      increments-cpu: 8
      max-cpu: 10
      max-memory: 99999Gi
      scale-up-interval: 15
      scale-up-threshold: 10

security: none

labels:
  component: jest
  product: my-product

environments:
  production:
    min-instances: 1
  staging: none
        `,
      });

      const spec = loadServiceDefinition('cloud-deploy.yaml');
      expect(spec).toMatchObject({
        kubernetes: {
          scaling: {
            vertical: {
              threshold: 100,
              'kafka-lag-threshold': 999999,
              'increments-cpu': 8,
              'max-cpu': 10,
              'max-memory': '99999Gi',
              'scale-up-interval': 15,
              'scale-up-threshold': 10,
            },
          },
        },
      });
    });
  });
});
