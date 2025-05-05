const nock = require('nock');
const getDeployInfo = require('../src/deploy-info');
const { execGcloud } = require('../../setup-gcloud');

jest.mock('../../setup-gcloud');

afterEach(() => {
  nock.cleanAll();
});

test('Get deploy info', async () => {
  execGcloud.mockResolvedValueOnce('token');
  const token = await execGcloud(
    ['auth', 'print-identity-token'],
    'gcloud',
    true,
  );

  const scope = nock('https://platform-api.retailsvc.com')
    .post('/info/deploy')
    .once()
    .reply(200, {
      serviceName: 'checkout-service-manager-api',
      updates: false,
      vulnerabilities: false,
    });

  const deployInfo = await getDeployInfo(
    {
      'cloud-run': {
        name: 'testrunner-eu-checkout-api',
        protocol: 'http',
        timeout: 300,
      },
      environments: {
        production: {
          'domain-mappings': ['checkout-service-manager.retailsvc.com'],
          'path-mappings': [
            {
              paths: ['/platform-api/health', '/platform-api/health/*'],
              service: 'hiiretail-platform-api',
              'path-rewrite': '/health',
            },
          ],
        },
      },
    },
    'platform-prod-2481',
    token,
  );
  expect(scope.isDone()).toEqual(true);
  expect(deployInfo).toEqual({
    serviceName: 'checkout-service-manager-api',
    updates: false,
    vulnerabilities: false,
  });
});
