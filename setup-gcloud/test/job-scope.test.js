import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { getJobScope } from '../src/job-scope.js';

describe('job-scope', () => {
  let orgEnv;

  beforeEach(() => {
    orgEnv = process.env;
    process.env = {
      ...orgEnv,
      RUNNER_TEMP: '/runner/temp',
      GITHUB_RUN_ID: '12345',
      GITHUB_RUN_ATTEMPT: '2',
    };
  });

  afterEach(() => {
    process.env = orgEnv;
  });

  test('returns job-scoped path with default prefix', () => {
    const path = getJobScope();
    expect(path).toBe('/runner/temp/setup-gcloud-12345-2');
  });

  test('returns job-scoped path with custom prefix', () => {
    const path = getJobScope({ prefix: 'gcloud-config' });
    expect(path).toBe('/runner/temp/gcloud-config-12345-2');
  });

  test('defaults GITHUB_RUN_ATTEMPT to "1" when not set', () => {
    delete process.env.GITHUB_RUN_ATTEMPT;
    const path = getJobScope();
    expect(path).toBe('/runner/temp/setup-gcloud-12345-1');
  });

  test('throws when RUNNER_TEMP is not set', () => {
    delete process.env.RUNNER_TEMP;
    expect(() => getJobScope()).toThrow('RUNNER_TEMP and GITHUB_RUN_ID');
  });

  test('throws when GITHUB_RUN_ID is not set', () => {
    delete process.env.GITHUB_RUN_ID;
    expect(() => getJobScope()).toThrow('RUNNER_TEMP and GITHUB_RUN_ID');
  });
});
