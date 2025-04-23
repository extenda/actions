jest.mock('@actions/core');
jest.mock('../../utils');

const mockCreate = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      repos: {
        createCommitStatus: mockCreate,
      },
    },
  }),
}));

const core = require('@actions/core');
const action = require('../src/index');
const { loadGitHubToken } = require('../../utils');

const orgEnv = process.env;

describe('status-check', () => {
  afterEach(() => {
    jest.resetAllMocks();
    process.env = orgEnv;
  });
  beforeEach(() => {
    process.env = {
      ...orgEnv,
    };
    loadGitHubToken.mockResolvedValueOnce('github-token');
  });

  test('It can create a new check', async () => {
    core.getInput
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('sha-value')
      .mockReturnValueOnce('my-check')
      .mockReturnValueOnce('pending')
      .mockReturnValueOnce('Description')
      .mockReturnValueOnce(''); // No url

    await action();

    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      sha: 'sha-value',
      context: 'my-check',
      state: 'pending',
      description: 'Description',
    });
  });

  test('It can update an existing check', async () => {
    process.env.GITHUB_REPOSITORY = 'extenda/test-repo';
    process.env.GITHUB_SHA = 'sha-value';

    core.getInput
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('my-check')
      .mockReturnValueOnce('success')
      .mockReturnValueOnce('A description')
      .mockReturnValueOnce('http://test.com');

    await action();

    expect(mockCreate).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'test-repo',
      sha: 'sha-value',
      context: 'my-check',
      state: 'success',
      description: 'A description',
      target_url: 'http://test.com',
    });
  });

  test('It fails on invalid status', async () => {
    core.getInput
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('sha-value')
      .mockReturnValueOnce('my-check')
      .mockReturnValueOnce('skipped')
      .mockReturnValueOnce('Output title')
      .mockReturnValueOnce('');

    await expect(action()).rejects.toEqual(
      new Error("Unsupported state: 'skipped'"),
    );
  });
});
