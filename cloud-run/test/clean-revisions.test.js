const exec = require('@actions/exec');
const cleanRevisions = require('../src/clean-revisions');

jest.mock('@actions/exec');

const revisionsListString = [`rev-00001-tst
rev-00002-tst
rev-00003-tst
rev-00004-tst
rev-00005-tst
rev-00006-tst
rev-00007-tst
rev-00008-tst
rev-00009-tst`];

describe('clean revisions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('clean revisions', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(revisionsListString));
    cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
