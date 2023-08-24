const mockFs = require('mock-fs');
const loadServiceDefinition = require('../../src/utils/service-definition');

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

security:
  open-policy-agent:
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
        'open-policy-agent': {
          'permission-prefix': 'mye',
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

security: none

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
});
