jest.mock('@actions/core');
jest.mock('../../src/utils/gcloud-output', () => jest.fn().mockImplementation(() => Promise.resolve()));

const checkIamSystem = require('../../src/manifests/check-system');
const execGcloud = require('../../src/utils/gcloud-output');

describe('Check iam bundles system', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can check bundle exists', async () => {
    execGcloud.mockResolvedValueOnce(true);
    await checkIamSystem('systemName');
    expect(execGcloud).toHaveBeenNthCalledWith(1, [
      'ls',
      'gs://authz-bundles/systems/systemName.tar.gz',
    ], 'gsutil', expect.anything(), expect.anything());
  });
});
