import nock from 'nock';

import { execGcloud } from '../../setup-gcloud';
import getDeployInfo from '../src/deploy-info.js';

jest.mock('../../setup-gcloud');

let token;

beforeEach(async () => {
  execGcloud.mockResolvedValueOnce('token');
  token = await execGcloud(['auth', 'print-identity-token'], 'gcloud', true);
});

afterEach(() => {
  nock.cleanAll();
});

test('Get deploy info', async () => {
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
        service: 'testrunner-eu-checkout-api',
        protocol: 'http',
        timeout: 300,
      },
      security: 'none',
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
    serveTraffic: true,
  });
});

test('Get deploy info with canary deployment', async () => {
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
        service: 'testrunner-eu-checkout-api',
        protocol: 'http',
        timeout: 300,
        traffic: {
          'serve-traffic': false,
        },
      },
      security: 'none',
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
    serveTraffic: false,
  });
});

test('Get deploy info with Kubernetes', async () => {
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
      kubernetes: {
        service: 'testrunner-eu-checkout-api',
        protocol: 'http',
        timeout: 300,
      },
      security: 'none',
      environments: {
        production: {
          'domain-mappings': ['checkout-service-manager.retailsvc.com'],
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
    serveTraffic: true,
  });
});
