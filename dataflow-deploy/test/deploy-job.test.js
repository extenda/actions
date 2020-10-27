jest.mock('@actions/exec');
const exec = require('@actions/exec');
const deployJob = require('../src/deploy-job');

describe('deploy dataflow job', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('deploy job', async () => {
    deployJob(
      'job-name-10',
      'test=job-test',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/',
      'europe-west1',
      'test-staging-323',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
