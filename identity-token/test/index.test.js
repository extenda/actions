jest.mock('@actions/core');
jest.mock('../src/fetch-token');
jest.mock('../../setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');
const { setupGcloud } = require('../../setup-gcloud');
const fetchToken = require('../src/fetch-token');

describe('Fetch identity token action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    core.getInput
      .mockReturnValueOnce('service-account-key')
      .mockReturnValueOnce('my-sa@example.iam.gserviceaccount.com')
      .mockReturnValueOnce('bhq-braveheart-quotes');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(fetchToken).toHaveBeenCalledWith(
      'my-sa@example.iam.gserviceaccount.com',
      'bhq-braveheart-quotes',
    );
  });
});
