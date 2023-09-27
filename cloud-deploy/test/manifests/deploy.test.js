const gcloudOutput = require('../../src/utils/gcloud-output');
const deploy = require('../../src/manifests/deploy');
const { setRetryDelay } = require('../../src/utils/retry-until');

jest.mock('../../src/utils/gcloud-output');

const progressCommand = expect.arrayContaining([
  'deploy',
  'rollouts',
  'list',
]);

describe('manifests/deploy', () => {
  beforeEach(() => {
    setRetryDelay(100, 1000);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It will wait for deploy to succeed', async () => {
    gcloudOutput.mockResolvedValueOnce('') // deploy apply
      .mockResolvedValueOnce('') // deploy release
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('SUCCEEDED'); // deploy state

    const result = await deploy('my-project', 'my-service', '0.0.1-local');
    expect(result).toEqual(true);

    expect(gcloudOutput).toHaveBeenCalledTimes(6);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'deploy',
      'apply',
      '--file=clouddeploy.yaml',
      '--project=my-project',
      '--region=europe-west1',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'deploy',
      'releases',
      'create',
      'my-service-0.0.1-local',
      '--delivery-pipeline=my-service',
      '--project=my-project',
      '--region=europe-west1',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, progressCommand);
    expect(gcloudOutput).toHaveBeenNthCalledWith(4, progressCommand);
    expect(gcloudOutput).toHaveBeenNthCalledWith(5, progressCommand);
  });

  test('It will fail on deploy failure', async () => {
    gcloudOutput.mockResolvedValueOnce('') // deploy apply
      .mockResolvedValueOnce('') // deploy release
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('FAILED'); // deploy state

    const result = await deploy('my-project', 'my-service', '0.0.1-local');
    expect(result).toEqual(false);

    expect(gcloudOutput).toHaveBeenCalledTimes(5);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'deploy',
      'apply',
      '--file=clouddeploy.yaml',
      '--project=my-project',
      '--region=europe-west1',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'deploy',
      'releases',
      'create',
      'my-service-0.0.1-local',
      '--delivery-pipeline=my-service',
      '--project=my-project',
      '--region=europe-west1',
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, progressCommand);
    expect(gcloudOutput).toHaveBeenNthCalledWith(4, progressCommand);
    expect(gcloudOutput).toHaveBeenNthCalledWith(5, progressCommand);
  });
});
