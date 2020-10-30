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
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('gs://test-template/10/template.json')
      .mockReturnValueOnce('flex-template')
      .mockReturnValueOnce('test=job,test2=job2')
      .mockReturnValueOnce('gs://clan-dataflow/job-name/10/staging')
      .mockReturnValueOnce('europe-west4')
      .mockReturnValueOnce('tribe-network')
      .mockReturnValueOnce('clan-resources');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(11);
    expect(deployJob).toHaveBeenCalledWith(
      'job-name-10',
      'test=job,test2=job2',
      'dataflow-sa',
      'gs://test-template/10/template.json',
      'europe-west4',
      'test-project-342',
      'flex-template',
      'gs://clan-dataflow/job-name/10/staging',
      'tribe-network',
      'clan-resources',
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
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('gs://test-template/10/template.json')
      .mockReturnValueOnce('flex-template')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('europe-west1')
      .mockReturnValueOnce('clan-resources')
      .mockReturnValueOnce('tribe-network');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(11);
    expect(deployJob).toHaveBeenCalledWith(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://test-template/10/template.json',
      'europe-west1',
      'test-project-342',
      'flex-template',
      '',
      'clan-resources',
      'tribe-network',
    );
    expect(drainJob).toHaveBeenCalledWith(
      'job-name',
      'job-name-10',
      'europe-west1',
      'test-project-342',
    );
  });
});
