import cleanRevisions from '../../src/cloudrun/clean-revisions';
import getRevisions from '../../src/cloudrun/get-revisions';
import execGcloud from '../../src/utils/gcloud-output';

jest.mock('../../src/cloudrun/get-revisions');
jest.mock('../../src/utils/gcloud-output');

describe('clean revisions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('clean revisions', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9', active: true },
      { name: 'rev-00008-tst', creationTimestamp: '8', active: false },
      { name: 'rev-00007-tst', creationTimestamp: '7', active: false },
      { name: 'rev-00006-tst', creationTimestamp: '6', active: false },
      { name: 'rev-00005-tst', creationTimestamp: '5', active: false },
      { name: 'rev-00004-tst', creationTimestamp: '4', active: false },
      { name: 'rev-00003-tst', creationTimestamp: '3', active: false },
      { name: 'rev-00002-tst', creationTimestamp: '2', active: false },
      { name: 'rev-00001-tst', creationTimestamp: '1', active: false },
    ]);
    execGcloud.mockResolvedValue('');
    await cleanRevisions(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
      3,
    );
    expect(getRevisions).toHaveBeenCalled();
    expect(execGcloud).toHaveBeenCalledTimes(6);

    expect(execGcloud).not.toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00009-tst']),
    );
    expect(execGcloud).not.toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00008-tst']),
    );
    expect(execGcloud).not.toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00007-tst']),
    );

    expect(execGcloud).toHaveBeenCalledWith(
      [
        'run',
        'revisions',
        'delete',
        'rev-00006-tst',
        '-q',
        '--project=test-staging-t3st',
        '--region=europe-west1',
        '--no-user-output-enabled',
      ],
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00005-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00004-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00003-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00002-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00001-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
  });

  test('Clean revisions not needed', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9', active: true },
      { name: 'rev-00008-tst', creationTimestamp: '8', active: false },
      { name: 'rev-00007-tst', creationTimestamp: '7', active: false },
    ]);
    execGcloud.mockResolvedValue('');
    await cleanRevisions(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
      3,
    );
    expect(getRevisions).toHaveBeenCalled();
    expect(execGcloud).toHaveBeenCalledTimes(0);
  });

  test('Clean single revision', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9', active: true },
      { name: 'rev-00008-tst', creationTimestamp: '8', active: false },
      { name: 'rev-00007-tst', creationTimestamp: '7', active: false },
      { name: 'rev-00006-tst', creationTimestamp: '6', active: false },
    ]);
    execGcloud.mockResolvedValue(0);
    await cleanRevisions(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
      3,
    );
    expect(getRevisions).toHaveBeenCalledWith(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
    );
    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00006-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
  });

  test('Preserve old still active revision', async () => {
    getRevisions.mockResolvedValueOnce([
      { name: 'rev-00009-tst', creationTimestamp: '9', active: false },
      { name: 'rev-00008-tst', creationTimestamp: '8', active: false },
      { name: 'rev-00007-tst', creationTimestamp: '7', active: false },
      { name: 'rev-00006-tst', creationTimestamp: '6', active: true },
    ]);
    execGcloud.mockResolvedValue(0);
    await cleanRevisions(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
      3,
    );
    expect(getRevisions).toHaveBeenCalledWith(
      'service-name',
      'test-staging-t3st',
      'europe-west1',
    );
    expect(execGcloud).not.toHaveBeenCalledWith(
      expect.arrayContaining(['delete', 'rev-00006-tst']),
      'gcloud',
      expect.anything(),
      expect.anything(),
    );
  });
});
