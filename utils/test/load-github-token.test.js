const core = require('@actions/core');
const loadGitHubToken = require('../src/load-github-token');

jest.mock('@actions/core');

describe('Load GitHub Token', () => {
  test('It will use provided token', async () => {
    core.getInput.mockReturnValueOnce('my-token');
    const loadSecret = jest.fn();
    const result = await loadGitHubToken(loadSecret);
    expect(result).toEqual('my-token');
    expect(loadSecret).not.toHaveBeenCalled();
  });

  test('It will fail if missing github-token-name', async () => {
    core.getInput.mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('sa');

    await expect(loadGitHubToken(jest.fn())).rejects
      .toEqual(new Error('Missing input. The secret-name must be set with service-account-key'));
  });

  test('It will fail if missing service-account-key', async () => {
    core.getInput.mockReturnValueOnce('')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('');

    await expect(loadGitHubToken(jest.fn())).rejects
      .toEqual(new Error('Missing input. Either provide github-token or service-account-key'));
  });

  test('It will load token using callback', async () => {
    core.getInput.mockReturnValueOnce('')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('sa');
    const loadSecret = jest.fn();
    loadSecret.mockResolvedValueOnce('token-value');
    const result = await loadGitHubToken(loadSecret);
    expect(result).toEqual('token-value');
    expect(loadSecret).toHaveBeenCalledWith('sa', 'github-token');
  });
});
