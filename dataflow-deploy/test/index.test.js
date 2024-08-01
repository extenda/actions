jest.mock('@actions/core');
jest.mock('../src/deploy-job');
jest.mock('../src/drain-job');
jest.mock('../../setup-gcloud');
jest.mock('../../cloud-run/src/cluster-info');

const core = require('@actions/core');
const action = require('../src/index');
const { setupGcloud } = require('../../setup-gcloud');
const drainJob = require('../src/drain-job');
const deployJob = require('../src/deploy-job');
const { getTribeProject } = require('../../cloud-run/src/cluster-info');

const orgEnv = process.env;

describe('deploy dataflow Action', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_REF = 'refs/heads/master';
  });

  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });

  test('It can run the action', async () => {
    setupGcloud.mockReturnValueOnce('test-project-342');
    getTribeProject.mockReturnValueOnce('test-project-123');
    deployJob.mockResolvedValueOnce('jobId');
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('job-name')
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('gs://test-template/10/template.json')
      .mockReturnValueOnce('flex-template')
      .mockReturnValueOnce('test=job,test2=job2')
      .mockReturnValueOnce('gs://clan-dataflow/job-name/10/staging')
      .mockReturnValueOnce('europe-west4')
      .mockReturnValueOnce('tribe-network')
      .mockReturnValueOnce('1')
      .mockReturnValueOnce('4')
      .mockReturnValueOnce(
        'https://www.googleapis.com/compute/v1/projects/test-project-123/regions/europe-west4/subnetworks/clan-resources',
      );
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(12);
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
      'https://www.googleapis.com/compute/v1/projects/test-project-123/regions/europe-west4/subnetworks/clan-resources',
      '1',
      '4',
    );
    expect(drainJob).toHaveBeenCalledWith(
      'jobId',
      'job-name',
      'europe-west4',
      'test-project-342',
    );
  });

  test('It can run the action without optional parameters', async () => {
    setupGcloud.mockReturnValueOnce('test-project-342');
    deployJob.mockResolvedValueOnce('jobId');
    getTribeProject.mockReturnValueOnce('test-project-123');
    deployJob.mockResolvedValueOnce('jobId');
    core.getInput
      .mockReturnValueOnce('service-account')
      .mockReturnValueOnce('job-name')
      .mockReturnValueOnce('10')
      .mockReturnValueOnce('dataflow-sa')
      .mockReturnValueOnce('gs://test-template/10/template.json')
      .mockReturnValueOnce('flex-template')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('europe-west1')
      .mockReturnValueOnce('tribe-network')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');
    await action();

    expect(core.getInput).toHaveBeenCalledTimes(12);
    expect(deployJob).toHaveBeenCalledWith(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://test-template/10/template.json',
      'europe-west1',
      'test-project-342',
      'flex-template',
      '',
      'tribe-network',
      'https://www.googleapis.com/compute/v1/projects/test-project-123/regions/europe-west1/subnetworks/clan-resources',
      '',
      '',
    );
    expect(drainJob).toHaveBeenCalledWith(
      'jobId',
      'job-name',
      'europe-west1',
      'test-project-342',
    );
  });

  test('It rejects action if not trunk-based', async () => {
    core.getInput.mockReturnValue('test');
    process.env.GITHUB_REF = 'refs/heads/develop';
    await expect(action()).rejects.toThrow(
      /^Action not allowed on ref refs\/heads\/develop/,
    );
  });
});
