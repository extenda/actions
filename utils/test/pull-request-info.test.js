import { afterEach, describe, expect, test, vi } from 'vitest';

const { mockPulls } = vi.hoisted(() => ({
  mockPulls: vi.fn(),
}));

vi.mock('@actions/github', () => ({
  context: {},
  getOctokit: () => ({
    rest: {
      pulls: {
        list: mockPulls,
      },
    },
  }),
}));

import { getPullRequestInfo, setContext } from '../src/pull-request-info.js';

describe('Pull Request Info', () => {
  afterEach(() => {
    vi.resetAllMocks();
    setContext({});
  });

  test('It uses event data for pull_request event', async () => {
    setContext({
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

    const info = await getPullRequestInfo('TOKEN');
    expect(info).toMatchObject({
      base: { ref: 'base-ref' },
      head: { ref: 'head-ref' },
      number: '1',
    });
    expect(mockPulls).not.toHaveBeenCalled();
  });

  test('It can find an open pull request with Octokit', async () => {
    setContext({
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
      data: [
        {
          base: { ref: 'base-ref' },
          head: { ref: 'head-ref', sha: '123456' },
          number: '2',
        },
      ],
    });
    const info = await getPullRequestInfo('TOKEN');
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
    setContext({
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
    const info = await getPullRequestInfo('TOKEN');
    expect(info).toBeFalsy();
    expect(mockPulls).toHaveBeenCalled();
  });

  test('It will swallow Octokit errors', async () => {
    setContext({
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
    const info = await getPullRequestInfo('TOKEN');
    expect(info).toBeFalsy();
    expect(mockPulls).toHaveBeenCalled();
  });
});
