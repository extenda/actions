jest.mock('@actions/core');
jest.mock('@actions/cache');

const { homedir } = require('os');
const path = require('path');
const core = require('@actions/core');
const cache = require('@actions/cache');
const { saveCache, restoreCache } = require('../src/maven-cache');

describe('Maven cache', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('It uses cache inputs', async () => {
    core.getInput.mockReturnValue('value');
    await restoreCache();
    expect(core.getInput).toHaveBeenCalledWith('cache-key');
    expect(core.getInput).toHaveBeenCalledWith('cache-restore-keys');
  });

  test('It will restore a cache', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('test-maven-');
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
    await restoreCache();
    expect(cache.restoreCache.mock.calls[0][2]).toEqual(['test-maven-', 'test-', 'test-maven-123']);
  });

  test('It handles empty restore keys', async () => {
    core.getInput.mockReturnValueOnce('test-maven-12345')
      .mockReturnValueOnce('');
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
    await saveCache();
    expect(cache.saveCache).toHaveBeenCalledWith(
      [path.join(homedir(), '.m2', 'repository')],
      'test-maven-12345',
    );
  });
});
