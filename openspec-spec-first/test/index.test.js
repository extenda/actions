import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');

const mockGetTree = vi.fn();
const mockGetBlob = vi.fn();
const mockRepoGet = vi.fn();
vi.mock('@actions/github', () => ({
  context: {
    payload: {
      pull_request: { title: 'feat(HICC-12): Add x' },
      repository: { name: 'my-repo' },
    },
  },
  getOctokit: (token) => ({
    token,
    rest: {
      repos: { get: mockRepoGet },
      git: { getTree: mockGetTree, getBlob: mockGetBlob },
    },
  }),
}));

import * as core from '@actions/core';

import action from '../src/index.js';

const heading = '## 1. my-repo: Work (HICC-12)\n- [ ] 1.1 x\n';

describe('openspec-spec-first action', () => {
  beforeEach(() => {
    mockRepoGet.mockResolvedValue({ data: { default_branch: 'main' } });
    mockGetTree.mockResolvedValue({
      data: {
        truncated: false,
        tree: [
          { path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' },
        ],
      },
    });
    mockGetBlob.mockResolvedValue({
      data: {
        content: Buffer.from(heading).toString('base64'),
        encoding: 'base64',
      },
    });
  });
  afterEach(() => vi.resetAllMocks());

  const inputs = (values) =>
    core.getInput.mockImplementation((name) => values[name] ?? '');

  test('reads title and repo from the event and checks the store', async () => {
    inputs({ store: 'extenda/store', token: 'tok' });
    await action();
    expect(core.setOutput).toHaveBeenCalledWith('key', 'HICC-12');
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.warning).not.toHaveBeenCalled();
    expect(mockGetTree).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'extenda',
        repo: 'store',
        tree_sha: 'main',
      }),
    );
  });

  test('the inputs win over the event', async () => {
    inputs({
      store: 'extenda/store',
      token: 'tok',
      title: 'feat(HICC-12): x',
      'repo-name': 'other-repo',
      'store-ref': 'release',
    });
    await action();
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining("'my-repo', this repo is 'other-repo'"),
    );
    expect(mockRepoGet).not.toHaveBeenCalled();
    expect(mockGetTree).toHaveBeenCalledWith(
      expect.objectContaining({ tree_sha: 'release' }),
    );
  });

  test('a title without a key in the store fails', async () => {
    inputs({ store: 'extenda/store', token: 'tok', title: 'feat(HICC-99): x' });
    await action();
    expect(core.setFailed).toHaveBeenCalled();
  });
});
