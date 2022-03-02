jest.mock('@actions/core');
jest.mock('../src/create-sign-attestion');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const { 
  createAttestation,
  getArtifactUrl
 } = require('../src/create-sign-attestion');

describe('Binary Auth Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project');
    getArtifactUrl.mockReturnValueOnce('eu.gcr.io/my-iamge@887686');
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('quality-assurance-attestor')
      .mockReturnValueOnce('attestor-project')
      .mockReturnValueOnce('key-project')
      .mockReturnValueOnce('europe-west1')
      .mockReturnValueOnce('global-keyring')
      .mockReturnValueOnce('key')
      .mockReturnValueOnce('1')
      .mockReturnValueOnce('eu.gcr.io/my-iamge');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(9);
    expect(createAttestation).toHaveBeenCalledWith(
      'eu.gcr.io/my-iamge@887686',
      'quality-assurance-attestor',
      'attestor-project',
      'key-project',
      'europe-west1',
      'global-keyring',
      'key',
      '1'
    );
  });
});
