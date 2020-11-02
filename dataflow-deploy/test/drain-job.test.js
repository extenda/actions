jest.mock('@actions/exec');
const exec = require('@actions/exec');
const drainJob = require('../src/drain-job');

describe('drain dataflow job', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('drain job', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout('job-name-9'));
    drainJob(
      'job-name',
      'job-name-10',
      'europe-west1',
      'test-staging-323',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
