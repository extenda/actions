import { describe, expect, test, vi } from 'vitest';

import { loadTasksFiles } from '../src/store.js';

// graphql answers every aliased b<i> of the query from the oid variables o<i>.
const graphqlWith = (blobs) =>
  vi.fn(async (query, variables) => {
    const repository = {};
    for (let i = 0; variables[`o${i}`] !== undefined; i += 1) {
      const text = blobs[variables[`o${i}`]];
      repository[`b${i}`] =
        text === undefined ? null : { text, isTruncated: false };
    }
    return { repository };
  });

const octokitWith = ({ tree, truncated = false, blobs = {} }) => ({
  graphql: graphqlWith(blobs),
  rest: {
    repos: {
      get: vi.fn().mockResolvedValue({ data: { default_branch: 'main' } }),
    },
    git: {
      getTree: vi.fn().mockResolvedValue({ data: { tree, truncated } }),
    },
  },
});

describe('loadTasksFiles', () => {
  test('reads every tasks.md under openspec/changes, archived included', async () => {
    const octokit = octokitWith({
      tree: [
        { path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' },
        {
          path: 'openspec/changes/archive/2026-01-01-b/tasks.md',
          type: 'blob',
          sha: 's2',
        },
        { path: 'openspec/changes/a/proposal.md', type: 'blob', sha: 's3' },
        { path: 'openspec/specs/tasks.md', type: 'blob', sha: 's4' },
        { path: 'openspec/changes/a/tasks.md.bak', type: 'blob', sha: 's5' },
        { path: 'openspec/changes/tasks.md', type: 'tree', sha: 's6' },
        { path: 'tasks.md', type: 'blob', sha: 's7' },
      ],
      blobs: { s1: 'one', s2: 'two' },
    });
    const files = await loadTasksFiles(octokit, 'extenda/store');
    expect(files).toEqual([
      { path: 'openspec/changes/a/tasks.md', content: 'one' },
      {
        path: 'openspec/changes/archive/2026-01-01-b/tasks.md',
        content: 'two',
      },
    ]);
    expect(octokit.rest.git.getTree).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'store',
      tree_sha: 'main',
      recursive: 'true',
    });
  });

  test('a store without openspec/changes fails', async () => {
    const octokit = octokitWith({
      tree: [{ path: 'README.md', type: 'blob', sha: 's' }],
    });
    await expect(loadTasksFiles(octokit, 'extenda/store')).rejects.toThrow(
      /No openspec\/changes in extenda\/store/,
    );
  });

  test('a store with changes but no tasks.md gives no files', async () => {
    const octokit = octokitWith({
      tree: [
        { path: 'openspec/changes/a/proposal.md', type: 'blob', sha: 's' },
      ],
    });
    expect(await loadTasksFiles(octokit, 'extenda/store')).toEqual([]);
  });

  test('uses the ref when given', async () => {
    const octokit = octokitWith({
      tree: [{ path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' }],
      blobs: { s1: 'x' },
    });
    await loadTasksFiles(octokit, 'extenda/store', 'release');
    expect(octokit.rest.repos.get).not.toHaveBeenCalled();
    expect(octokit.rest.git.getTree).toHaveBeenCalledWith(
      expect.objectContaining({ tree_sha: 'release' }),
    );
  });

  test('reads all blobs in one call and keeps the order', async () => {
    const tree = Array.from({ length: 20 }, (_, i) => ({
      path: `openspec/changes/c${i}/tasks.md`,
      type: 'blob',
      sha: `s${i}`,
    }));
    const blobs = Object.fromEntries(tree.map((e) => [e.sha, `text ${e.sha}`]));
    const octokit = octokitWith({ tree, blobs });
    const files = await loadTasksFiles(octokit, 'extenda/store');
    expect(files.map((f) => f.content)).toEqual(
      tree.map((e) => `text ${e.sha}`),
    );
    expect(octokit.graphql).toHaveBeenCalledTimes(1);
    expect(octokit.graphql.mock.calls[0][1]).toMatchObject({
      owner: 'extenda',
      repo: 'store',
      o0: 's0',
      o19: 's19',
    });
  });

  test('more than 100 files take several calls', async () => {
    const tree = Array.from({ length: 205 }, (_, i) => ({
      path: `openspec/changes/c${i}/tasks.md`,
      type: 'blob',
      sha: `s${i}`,
    }));
    const blobs = Object.fromEntries(tree.map((e) => [e.sha, e.sha]));
    const octokit = octokitWith({ tree, blobs });
    const files = await loadTasksFiles(octokit, 'extenda/store');
    expect(files.map((f) => f.content)).toEqual(tree.map((e) => e.sha));
    expect(octokit.graphql).toHaveBeenCalledTimes(3);
  });

  test('a failing GraphQL call (API or rate limit error) fails the load', async () => {
    const octokit = octokitWith({
      tree: [{ path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' }],
    });
    octokit.graphql = vi.fn().mockRejectedValue(new Error('rate limited'));
    await expect(loadTasksFiles(octokit, 'extenda/store')).rejects.toThrow(
      'rate limited',
    );
  });

  test('a missing or truncated blob fails the load', async () => {
    const tree = [
      { path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' },
    ];
    const missing = octokitWith({ tree, blobs: {} });
    await expect(loadTasksFiles(missing, 'extenda/store')).rejects.toThrow(
      /Cannot read openspec\/changes\/a\/tasks.md/,
    );
    const truncated = octokitWith({ tree });
    truncated.graphql = vi.fn().mockResolvedValue({
      repository: { b0: { text: 'half', isTruncated: true } },
    });
    await expect(loadTasksFiles(truncated, 'extenda/store')).rejects.toThrow(
      /Cannot read/,
    );
  });

  test('a truncated tree cannot pass', async () => {
    const octokit = octokitWith({ tree: [], truncated: true });
    await expect(loadTasksFiles(octokit, 'extenda/store')).rejects.toThrow(
      /truncated/,
    );
  });

  test('rejects a bad store name', async () => {
    await expect(loadTasksFiles({}, 'nope')).rejects.toThrow(/owner\/name/);
  });
});
