jest.mock('@actions/exec');
const exec = require('@actions/exec');
const deployJob = require('../src/deploy-job');

describe('deploy dataflow job', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('deploy flex-template job', async () => {
    const getJob = `line1
line2
id: jobId
`;
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(getJob));
    deployJob(
      'job-name-10',
      'test=job-test',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('deploy flex-template job without parameters', async () => {
    const getJob = `line1
line2
id: jobId
`;
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(getJob));
    deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/template.json',
      'europe-west1',
      'test-staging-323',
      'flex-template',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('deploy job', async () => {
    const getJob = `line1
line2
id: jobId
`;
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(getJob));
    deployJob(
      'job-name-10',
      '',
      'dataflow-sa',
      'gs://dataflow-templates-europe-west1/latest/Word_Count',
      'europe-west1',
      'test-staging-323',
      'job',
      'gs://dataflow-bucket/dataflow/templates/job-name/0.0.1/staging',
      'tribe-network',
      'clan-resources',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
