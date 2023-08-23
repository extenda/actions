const mockFs = require('mock-fs');
const loadServiceDefinition = require('../src/service-definition');

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
      subdomain: my-service
      domains:
        - retailsvc.com
        - retailsvc-test.com
    env: &env
      KEY: value
  staging:
    min-instances: 0
    max-instances: 1
    domain-mappings:
      subdomain: my-service
      domains:
        - retailsvc.dev
    env:
      <<: *env
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
          'domain-mappings': {
            subdomain: 'my-service',
            domains: ['retailsvc.com', 'retailsvc-test.com'],
          },
        },
      },
    });
  });
});