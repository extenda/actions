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
      { name: 'rev-00009-tst', creationTimestamp: '9' },
      { name: 'rev-00008-tst', creationTimestamp: '8' },
      { name: 'rev-00007-tst', creationTimestamp: '7' },
      { name: 'rev-00006-tst', creationTimestamp: '6' },
      { name: 'rev-00005-tst', creationTimestamp: '5' },
      { name: 'rev-00004-tst', creationTimestamp: '4' },
      { name: 'rev-00003-tst', creationTimestamp: '3' },
      { name: 'rev-00002-tst', creationTimestamp: '2' },
      { name: 'rev-00001-tst', creationTimestamp: '1' },
    ]);
    exec.exec.mockResolvedValue(0);
    await cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(exec.exec).toHaveBeenCalledTimes(6);

    expect(exec.exec).not.toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00009-tst']), expect.anything());
    expect(exec.exec).not.toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00008-tst']), expect.anything());
    expect(exec.exec).not.toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00007-tst']), expect.anything());

    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00006-tst']), expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00005-tst']), expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00004-tst']), expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00003-tst']), expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00002-tst']), expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00001-tst']), expect.anything());
  });

  test('Clean revisions not needed', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9' },
      { name: 'rev-00008-tst', creationTimestamp: '8' },
      { name: 'rev-00007-tst', creationTimestamp: '7' },
    ]);
    exec.exec.mockResolvedValue(0);
    await cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(exec.exec).toHaveBeenCalledTimes(0);
  });

  test('Clean single revision', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9' },
      { name: 'rev-00008-tst', creationTimestamp: '8' },
      { name: 'rev-00007-tst', creationTimestamp: '7' },
      { name: 'rev-00006-tst', creationTimestamp: '6' },
    ]);
    exec.exec.mockResolvedValue(0);
    await cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', expect.arrayContaining(['delete', 'rev-00006-tst']), expect.anything());
  });
});
