const { execGcloud } = require('../../../setup-gcloud');
const cleanRevisions = require('../../src/cloudrun/clean-revisions');
const getRevisions = require('../../src/cloudrun/get-revisions');

jest.mock('../../src/cloudrun/get-revisions');
jest.mock('../../../setup-gcloud');

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
    execGcloud.mockResolvedValue('');
    await cleanRevisions('service-name', 'test-staging-t3st', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(execGcloud).toHaveBeenCalledTimes(6);

    expect(execGcloud).not.toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00009-tst']));
    expect(execGcloud).not.toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00008-tst']));
    expect(execGcloud).not.toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00007-tst']));

    expect(execGcloud).toHaveBeenCalledWith([
      'run',
      'revisions',
      'delete',
      'rev-00006-tst',
      '-q',
      '--project=test-staging-t3st',
      '--region=europe-west1',
      '--no-user-output-enabled',
    ]);
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00005-tst']));
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00004-tst']));
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00003-tst']));
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00002-tst']));
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00001-tst']));
  });

  test('Clean revisions not needed', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9' },
      { name: 'rev-00008-tst', creationTimestamp: '8' },
      { name: 'rev-00007-tst', creationTimestamp: '7' },
    ]);
    execGcloud.mockResolvedValue('');
    await cleanRevisions('service-name', 'test-staging-t3st', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalled();
    expect(execGcloud).toHaveBeenCalledTimes(0);
  });

  test('Clean single revision', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9' },
      { name: 'rev-00008-tst', creationTimestamp: '8' },
      { name: 'rev-00007-tst', creationTimestamp: '7' },
      { name: 'rev-00006-tst', creationTimestamp: '6' },
    ]);
    execGcloud.mockResolvedValue(0);
    await cleanRevisions('service-name', 'test-staging-t3st', 'k8s-cluster', 'europe-west1', 3);
    expect(getRevisions).toHaveBeenCalledWith('service-name', 'test-staging-t3st', 'europe-west1');
    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith(expect.arrayContaining(['delete', 'rev-00006-tst']));
  });
});
