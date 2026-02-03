import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');

import * as core from '@actions/core';

import handleError from '../../src/utils/error-handler.js';

describe('handle errors', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('It can identify permission error and throw error', async () => {
    const errorMessage = `ERROR: (gcloud.compute.network-endpoint-groups.create) Could not fetch resource:
    - Required 'compute.xxx.create' permission for 'projects/xxx/regions/europe-west1/xxx/xxx-cloudrun'`;

    await expect(handleError(errorMessage)).rejects.toEqual(
      new Error(
        'Permissions are missing for your ci-cd account, verify you have all required permissions mentioned in the migration docs: https://docs.google.com/document/d/1uQjorCDupWN0i7MOK34f-RnkzgYvsnv24YdsXkAYEkE',
      ),
    );
  });

  test('It can identify was not found error and continue', async () => {
    const errorMessage = `ERROR: (gcloud.compute.url-maps.describe) Could not fetch resource:
    - The resource 'projects/xxx/global/urlMaps/xxx-prod-lb-external' was not found`;
    const action = 'network-endpoint-group';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(
      `${action} resulted in: was not found`,
    );
  });

  test('It can identify already exists error and continue', async () => {
    const errorMessage = `ERROR: (gcloud.compute.url-maps.create) Could not fetch resource:
    - The resource 'projects/xxx/global/urlMaps/xxx-prod-lb-external' already exists`;
    const action = 'loadbalancer';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(
      `${action} resulted in: already exists`,
    );
  });

  test('It can identify false error and print action succeeded', async () => {
    const errorMessage = 'failed';
    const action = 'Remove loadbalancer';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(`${action} resulted in: failed`);
  });

  test('It can identify already used error and throw error', async () => {
    const errorMessage = `ERROR: (gcloud.compute.backend-services.delete) Some requests did not succeed:
    - The backend_service resource 'projects/xx/regions/europe-west1/backendServices/xxx-internal-backend' is already being used by 'projects/xxx/regions/europe-west1/urlMaps/xxx-lb-internal'`;

    await expect(handleError(errorMessage)).rejects.toEqual(
      new Error(
        'Unable to remove backend due to being used elsewhere, please contact platform team',
      ),
    );
  });
});
