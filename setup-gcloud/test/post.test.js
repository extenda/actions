import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const getCredentialFilesFromState = vi.fn();
const cleanupCredentials = vi.fn();
const resetAuthStack = vi.fn();

vi.mock('../src/cleanup.js', () => ({
  getCredentialFilesFromState,
  cleanupCredentials,
}));

vi.mock('../src/auth-gcloud.js', () => ({
  resetAuthStack,
}));

describe('post cleanup', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('reads credential files from state and passes them to cleanup', async () => {
    getCredentialFilesFromState.mockReturnValueOnce([
      '/tmp/a.json',
      '/tmp/b.json',
    ]);
    resetAuthStack.mockResolvedValueOnce(undefined);

    await import('../src/post.js');

    expect(getCredentialFilesFromState).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith([
      '/tmp/a.json',
      '/tmp/b.json',
    ]);
    expect(resetAuthStack).toHaveBeenCalledTimes(1);
  });

  test('passes empty list to cleanup when no state exists', async () => {
    getCredentialFilesFromState.mockReturnValueOnce([]);
    resetAuthStack.mockResolvedValueOnce(undefined);

    await import('../src/post.js');

    expect(getCredentialFilesFromState).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith([]);
    expect(resetAuthStack).toHaveBeenCalledTimes(1);
  });
});
