const exec = require('@actions/exec');
const cleanRevisions = require('../src/clean-revisions');
const getRevisions = require('../src/get-revisions');

jest.mock('@actions/exec');
jest.mock('../src/get-revisions');

describe('clean revisions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('clean revisions', async () => {
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
    exec.exec.mockResolvedValue(0);
    await cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(exec.exec).toHaveBeenCalledTimes(6);
  });
});
