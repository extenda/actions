jest.mock('@actions/core');
jest.mock('../src/deploy-job');
jest.mock('../src/drain-job');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const core = require('@actions/core');
const action = require('../src/index');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const drainJob = require('../src/drain-job');
const deployJob = require('../src/deploy-job');

describe('Cloud Run Action', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project-342');
    deployJob.mockResolvedValueOnce(0);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('job-name')
      .mockReturnValueOnce('0.0.1')
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('test=job')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('bucket-name')
      .mockReturnValueOnce('europe-west4');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(8);
    expect(deployJob).toHaveBeenCalledWith(
      'job-name-10',
      'test=job',
      'dataflow-sa',
      'gs://bucket-name/dataflow/templates/job-name/0.0.1/',
      'europe-west4',
      'test-project-342',
    );
    expect(drainJob).toHaveBeenCalledWith(
      'job-name',
      'job-name-10',
      'europe-west4',
      'test-project-342',
    );
  });

  test('It can run the action without optional parameters', async () => {
    setupGcloud.mockReturnValueOnce('test-project-342');
    deployJob.mockResolvedValueOnce(0);
    core.getInput.mockReturnValueOnce('service-account')
      .mockReturnValueOnce('job-name')
      .mockReturnValueOnce('0.0.1')
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('test=job')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('bucket-name');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(8);
    expect(deployJob).toHaveBeenCalledWith(
      'job-name-10',
      'test=job',
      'dataflow-sa',
      'gs://bucket-name/dataflow/templates/job-name/0.0.1/',
      'europe-west1',
      'test-project-342',
    );
    expect(drainJob).toHaveBeenCalledWith(
      'job-name',
      'job-name-10',
      'europe-west1',
      'test-project-342',
    );
  });
});
