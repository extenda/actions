const getRevisions = require('../src/get-revisions');
const getLatestRevision = require('../src/get-revision');

jest.mock('../src/get-revisions');

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
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '0' },
      { name: 'rev-00008-tst', creationTimestamp: '0' },
      { name: 'rev-00007-tst', creationTimestamp: '0' },
      { name: 'rev-00006-tst', creationTimestamp: '0' },
      { name: 'rev-00005-tst', creationTimestamp: '0' },
      { name: 'rev-00004-tst', creationTimestamp: '0' },
      { name: 'rev-00003-tst', creationTimestamp: '0' },
      { name: 'rev-00002-tst', creationTimestamp: '0' },
      { name: 'rev-00001-tst', creationTimestamp: '0' },
    ]);
    expect(getLatestRevision('namespace', cluster)).resolves.toEqual('rev-00009-tst');
    expect(getRevisions).toHaveBeenCalledTimes(1);
  });
});
