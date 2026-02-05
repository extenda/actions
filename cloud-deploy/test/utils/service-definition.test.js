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
});
