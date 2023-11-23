jest.mock('@actions/core');

const core = require('@actions/core');
const handleError = require('../../src/utils/error-handler');

describe('handle errors', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It can identify permission error and throw error', async () => {
    const errorMessage = `ERROR: (gcloud.compute.network-endpoint-groups.create) Could not fetch resource:
    - Required 'compute.xxx.create' permission for 'projects/xxx/regions/europe-west1/xxx/xxx-cloudrun'`;

    await expect(handleError(errorMessage))
      .rejects.toEqual(new Error('Permissions are missing for your ci-cd account, verify you have all required permissions mentioned in the migration docs: https://docs.google.com/document/d/1uQjorCDupWN0i7MOK34f-RnkzgYvsnv24YdsXkAYEkE'));
  });

  test('It can identify was not found error and continue', async () => {
    const errorMessage = `ERROR: (gcloud.compute.url-maps.create) Could not fetch resource:
    - The resource 'projects/xxx/global/urlMaps/xxx-prod-lb-external' was not found`;
    const action = 'network-endpoint-group';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(`${action} failed with: was not found, creating...`);
  });

  test('It can identify already exists error and continue', async () => {
    const errorMessage = `ERROR: (gcloud.compute.url-maps.create) Could not fetch resource:
    - The resource 'projects/xxx/global/urlMaps/xxx-prod-lb-external' already exists`;
    const action = 'loadbalancer';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(`${action} failed with: already exists`);
  });

  test('It can identify false error and print action succeeded', async () => {
    const errorMessage = '';
    const action = 'Remove loadbalancer';

    await handleError(errorMessage, action);
    expect(core.info).toHaveBeenCalledWith(`${action} succeded`);
  });
});
