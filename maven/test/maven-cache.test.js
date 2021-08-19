const mockFs = require('mock-fs');

jest.mock('@actions/core');
jest.mock('@actions/cache');

const { homedir } = require('os');
const path = require('path');
const fs = require('fs');
const core = require('@actions/core');
const cache = require('@actions/cache');
const { saveCache, restoreCache } = require('../src/maven-cache');

const now = Date.now();

const REPO_HOME = path.join(homedir(), '.m2', 'repository');

describe('Maven cache', () => {
  beforeEach(() => {
    const files = {};
    files[`${REPO_HOME}/junit/junit`] = {
      4.13: {
        'junit-4.13.pom': mockFs.file({
          content: '',
          ctime: now,
          mtime: now,
          atime: now + 1,
        }),
        'junit-4.13.jar': '',
        'junit-4.13.jar.lastUpdated': '',
      },
      4.12: {
        'junit-4.12.pom': mockFs.file({
          content: '',
          ctime: new Date(1),
          mtime: new Date(1),
          atime: new Date(1),
        }),
        'junit-4.12.jar': '',
        'junit-4.12.jar.lastUpdated': '',
      },
    };
    mockFs(files);
  });

  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  })

  test('It uses cache inputs', async () => {
    core.getInput.mockReturnValue('value');
    cache.restoreCache.mockResolvedValueOnce('value');
    await restoreCache();
    expect(core.getInput).toHaveBeenCalledWith('cache-key');
    expect(core.getInput).toHaveBeenCalledWith('cache-restore-keys');
  });

  test('It will restore a cache', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('test-maven-');
    cache.restoreCache.mockResolvedValueOnce('test-maven-');
    await restoreCache();
    expect(cache.restoreCache).toHaveBeenCalledWith(
      [path.join(homedir(), '.m2', 'repository')],
      'test-maven-12345',
      ['test-maven-'],
    );
  });

  test('It handles multiple restore keys', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('test-maven-\ntest-  test-maven-123');
    cache.restoreCache.mockResolvedValueOnce('test-maven-');
    await restoreCache();
    expect(cache.restoreCache.mock.calls[0][2]).toEqual(['test-maven-', 'test-', 'test-maven-123']);
  });

  test('It handles empty restore keys', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('');
    cache.restoreCache.mockResolvedValueOnce('test-maven-');
    await restoreCache();
    expect(cache.restoreCache.mock.calls[0][2]).toEqual(['test-maven-12345']);
  });

  test('It skips restore if cache-key is empty', async () => {
    core.getInput.mockReturnValueOnce('');
    await restoreCache();
    expect(cache.restoreCache).not.toHaveBeenCalled();
  });

  test('It skips save if cache-key is empty', async () => {
    core.getInput.mockReturnValueOnce('');
    await saveCache();
    expect(cache.saveCache).not.toHaveBeenCalled();
  });

  test('It saves cache for given cache-key', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345');
    cache.saveCache.mockResolvedValueOnce('12345');
    await saveCache();
    expect(cache.saveCache).toHaveBeenCalledWith(
      [path.join(homedir(), '.m2', 'repository')],
      'test-maven-12345',
    );
  });

  test('It saves state after restore', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('test-maven-');
    cache.restoreCache.mockResolvedValueOnce('test-maven-');
    await restoreCache();
    expect(core.saveState).toHaveBeenCalledWith('maven.RestoredKey', 'test-maven-');
    expect(core.saveState).toHaveBeenCalledWith('maven.RestoredTime', expect.stringMatching(/\d+/));
  });

  test('It skips housekeeping for exact cache hits', async () => {
    // Last updated marker exists before test.
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.jar.lastUpdated'))).toEqual(true);

    core.getInput.mockReturnValueOnce('test-maven-12345');
    core.getState.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce(`${now}`);
    cache.saveCache.mockResolvedValueOnce('12345');
    await saveCache();

    expect(core.getState).toHaveBeenNthCalledWith(1, 'maven.RestoredKey');
    expect(core.getState).toHaveBeenNthCalledWith(2, 'maven.RestoredTime');

    // No housekeeping.
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.13', 'junit-4.13.pom'))).toEqual(true);
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.pom'))).toEqual(true);

    // last updated files should always be deleted.
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.jar.lastUpdated'))).toEqual(false);
  });

  test('It removes unaccessed cache entries', async () => {
    // Last updated marker exists before test.
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.jar.lastUpdated'))).toEqual(true);

    core.getInput.mockReturnValueOnce('test-maven-12345');
    core.getState.mockReturnValueOnce('test-maven-')
      .mockReturnValueOnce(`${now}`);

    cache.saveCache.mockResolvedValueOnce('12345');
    await saveCache();

    expect(core.getState).toHaveBeenNthCalledWith(1, 'maven.RestoredKey');
    expect(core.getState).toHaveBeenNthCalledWith(2, 'maven.RestoredTime');

    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.13', 'junit-4.13.pom'))).toEqual(true);
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.pom'))).toEqual(false);

    // last updated files should always be deleted.
    expect(fs.existsSync(path.join(REPO_HOME, 'junit', 'junit', '4.12', 'junit-4.12.jar.lastUpdated'))).toEqual(false);
  });
});
