jest.mock('@actions/core');
jest.mock('../src/fetch-token');
jest.mock('../src/update-access');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const fetchToken = require('../src/fetch-token');
const updateAccess = require('../src/update-access');

describe('Fetch identity token action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    core.getInput.mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('my-sa@example.iam.gserviceaccount.com')
      .mockReturnValueOnce('bhq-braveheart-quotes');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(updateAccess).toHaveBeenCalledWith(
      'service-account-key',
      'my-sa@example.iam.gserviceaccount.com',
      'test-project',
      'add',
    );
    expect(fetchToken).toHaveBeenCalledWith(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
    expect(updateAccess).toHaveBeenCalledWith(
      'service-account-key',
      'my-sa@example.iam.gserviceaccount.com',
      'test-project',
      'remove',
    );
  });
});
