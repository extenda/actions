import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const getCredentialFilesFromState = vi.fn();
const cleanupCredentials = vi.fn();

vi.mock('../src/cleanup.js', () => ({
  getCredentialFilesFromState,
  cleanupCredentials,
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

    await import('../src/post.js');

    expect(getCredentialFilesFromState).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith([
      '/tmp/a.json',
      '/tmp/b.json',
    ]);
  });

  test('passes empty list to cleanup when no state exists', async () => {
    getCredentialFilesFromState.mockReturnValueOnce([]);

    await import('../src/post.js');

    expect(getCredentialFilesFromState).toHaveBeenCalledTimes(1);
    expect(cleanupCredentials).toHaveBeenCalledWith([]);
  });
});
