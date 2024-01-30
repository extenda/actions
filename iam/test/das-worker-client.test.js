const createDasWorkerClient = require('../src/das-worker-client');

describe('Configure bundle sync', () => {
  it('points to `.com` for normal systems', () => {
    expect(
      createDasWorkerClient('fsc.manual-sales-registration-ui-prod').defaults.baseURL,
    ).toBe('https://iam-das-worker.retailsvc.com/api/v1');
    expect(
      createDasWorkerClient('lps.hii-high-risk-fetch-staging').defaults.baseURL,
    ).toBe('https://iam-das-worker.retailsvc.com/api/v1');
    expect(
      createDasWorkerClient('iam.iam-api-prod').defaults.baseURL,
    ).toBe('https://iam-das-worker.retailsvc.com/api/v1');
  });

  it('points to `.dev` for iam staging systems', () => {
    expect(
      createDasWorkerClient('iam.iam-api-staging').defaults.baseURL,
    ).toBe('https://iam-das-worker.retailsvc.dev/api/v1');
    expect(
      createDasWorkerClient('iam.iam-oauth-client-managment-staging').defaults.baseURL,
    ).toBe('https://iam-das-worker.retailsvc.dev/api/v1');
  });
});
