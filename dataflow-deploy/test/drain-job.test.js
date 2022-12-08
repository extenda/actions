jest.mock('@actions/exec');
const exec = require('@actions/exec');
const drainJob = require('../src/drain-job');

describe('drain dataflow job', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('it drains job', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) => opts.listeners.stdout('jobId-122'));
    drainJob(
      'jobId-123',
      'job-name-10',
      'europe-west1',
      'test-staging-323',
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('it finds no old job', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) => opts.listeners.stdout(''));
    expect(drainJob(
      'jobId-123',
      'job-name-10',
      'europe-west1',
      'test-staging-323',
    )).resolves.toEqual(true);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
