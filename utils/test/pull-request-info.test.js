const mockPulls = jest.fn();

jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      pulls: {
        list: mockPulls,
      },
    },
    context: {},
  }),
}));

const pullInfo = require('../src/pull-request-info');

describe('Pull Request Info', () => {
  afterEach(() => {
    jest.resetAllMocks();
    pullInfo.setContext({});
  });

  test('It uses event data for pull_request event', async () => {
    pullInfo.setContext({
      eventName: 'pull_request',
      repo: {
        owner: 'extenda',
        repo: 'actions',
      },
      payload: {
        pull_request: {
          base: { ref: 'base-ref' },
          head: { ref: 'head-ref' },
          number: '1',
        },
      },
    });

    const info = await pullInfo.getPullRequestInfo('TOKEN');
    expect(info).toMatchObject({
      base: { ref: 'base-ref' },
      head: { ref: 'head-ref' },
      number: '1',
    });
    expect(mockPulls).not.toHaveBeenCalled();
  });

  test('It can find an open pull request with Octokit', async () => {
    pullInfo.setContext({
      eventName: 'push',
      repo: {
        owner: 'extenda',
        repo: 'actions',
      },
      payload: {
        push: {},
      },
      sha: '123456',
      ref: 'refs/heads/feature/test',
    });
    mockPulls.mockResolvedValueOnce({
      data: [{
        base: { ref: 'base-ref' },
        head: { ref: 'head-ref', sha: '123456' },
        number: '2',
      }],
    });
    const info = await pullInfo.getPullRequestInfo('TOKEN');
    expect(info).toMatchObject({
      base: { ref: 'base-ref' },
      head: { ref: 'head-ref' },
      number: '2',
    });
    expect(mockPulls).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'actions',
      state: 'open',
      head: 'extenda:feature/test',
    });
  });

  test('It can handle missing pull request', async () => {
    pullInfo.setContext({
      eventName: 'push',
      repo: {
        owner: 'extenda',
        repo: 'actions',
      },
      payload: {
        push: {},
      },
      sha: '123456',
      ref: 'refs/heads/feature/test',
    });
    mockPulls.mockResolvedValueOnce({
      data: [],
    });
    const info = await pullInfo.getPullRequestInfo('TOKEN');
    expect(info).toBeFalsy();
    expect(mockPulls).toHaveBeenCalled();
  });

  test('It will swallow Octokit errors', async () => {
    pullInfo.setContext({
      eventName: 'push',
      repo: {
        owner: 'extenda',
        repo: 'actions',
      },
      payload: {
        push: {},
      },
      sha: '123456',
      ref: 'refs/heads/feature/test',
    });
    mockPulls.mockRejectedValueOnce(new Error('Any error'));
    const info = await pullInfo.getPullRequestInfo('TOKEN');
    expect(info).toBeFalsy();
    expect(mockPulls).toHaveBeenCalled();
  });
});
