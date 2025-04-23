const gcloudOutput = require('../../src/utils/gcloud-output');
const deploy = require('../../src/manifests/deploy');
const { setRetryDelay } = require('../../src/utils/retry-until');
const cleanRevisions = require('../../src/cloudrun/clean-revisions');

jest.mock('../../src/utils/gcloud-output');
jest.mock('../../src/cloudrun/clean-revisions');
jest.mock('../../src/cloudrun/iam-bindings');

const progressCommand = expect.arrayContaining(['deploy', 'rollouts', 'list']);

describe('manifests/deploy', () => {
  beforeEach(() => {
    setRetryDelay(100, 1000);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It will wait for deploy to succeed', async () => {
    gcloudOutput
      .mockResolvedValueOnce('') // deploy apply
      .mockResolvedValueOnce('') // deploy release
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('SUCCEEDED'); // deploy state

    const result = await deploy(
      'my-project',
      'my-service',
      '0.0.1-local',
      false,
    );
    expect(result).toEqual(true);

    expect(gcloudOutput).toHaveBeenCalledTimes(5);
    expect(cleanRevisions).toHaveBeenCalled();

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
    gcloudOutput
      .mockResolvedValueOnce('') // deploy apply
      .mockResolvedValueOnce('') // deploy release
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('IN PROGRESS') // deploy state
      .mockResolvedValueOnce('FAILED'); // deploy state

    const result = await deploy(
      'my-project',
      'my-service',
      '0.0.1-local',
      true,
    );
    expect(result).toEqual(false);
    expect(cleanRevisions).not.toHaveBeenCalled();

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
