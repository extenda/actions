const exec = require('@actions/exec');
const getLatestRevision = require('../src/get-revision');

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

const cluster = {
  project: 'project-id',
  cluster: 'k8s-cluster',
  clusterLocation: 'europe-west1',
};

describe('get latest revision', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('get latest revision', async () => {
    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout(revisionsListString));
    expect(getLatestRevision('namespace', cluster)).resolves.toEqual('rev-00009-tst');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
