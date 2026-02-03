import { describe, expect, it } from 'vitest';

import getDasWorkerBaseUrl from '../src/das-worker-base-url.js';

describe('getDasWorkerBaseUrl', () => {
  it('points to `.com` for normal systems', () => {
    expect(getDasWorkerBaseUrl('fsc.manual-sales-registration-ui-prod')).toBe(
      'https://iam-das-worker.retailsvc.com/api/v1',
    );
    expect(getDasWorkerBaseUrl('lps.hii-high-risk-fetch-staging')).toBe(
      'https://iam-das-worker.retailsvc.com/api/v1',
    );
    expect(getDasWorkerBaseUrl('iam.iam-api-prod')).toBe(
      'https://iam-das-worker.retailsvc.com/api/v1',
    );
  });

  it('points to `.dev` for iam staging systems', () => {
    expect(getDasWorkerBaseUrl('iam.iam-api-staging')).toBe(
      'https://iam-das-worker.retailsvc.dev/api/v1',
    );
    expect(getDasWorkerBaseUrl('iam.iam-oauth-client-managment-staging')).toBe(
      'https://iam-das-worker.retailsvc.dev/api/v1',
    );
  });
});
