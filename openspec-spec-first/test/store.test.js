import { describe, expect, test, vi } from 'vitest';

import { loadTasksFiles } from '../src/store.js';

const b64 = (s) => Buffer.from(s).toString('base64');

const octokitWith = ({ tree, truncated = false, blobs = {} }) => ({
  rest: {
    repos: {
      get: vi.fn().mockResolvedValue({ data: { default_branch: 'main' } }),
    },
    git: {
      getTree: vi.fn().mockResolvedValue({ data: { tree, truncated } }),
      getBlob: vi.fn(async ({ file_sha }) => ({
        data: { content: b64(blobs[file_sha]), encoding: 'base64' },
      })),
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

  test('fetches at most 6 blobs at once and keeps the order', async () => {
    const tree = Array.from({ length: 20 }, (_, i) => ({
      path: `openspec/changes/c${i}/tasks.md`,
      type: 'blob',
      sha: `s${i}`,
    }));
    const octokit = octokitWith({ tree });
    let active = 0;
    let peak = 0;
    octokit.rest.git.getBlob = vi.fn(async ({ file_sha }) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return { data: { content: b64(file_sha), encoding: 'base64' } };
    });
    const files = await loadTasksFiles(octokit, 'extenda/store');
    expect(files.map((f) => f.content)).toEqual(tree.map((e) => e.sha));
    expect(peak).toBeLessThanOrEqual(6);
    expect(peak).toBeGreaterThan(1);
  });

  test('a failing blob fails the load', async () => {
    const octokit = octokitWith({
      tree: [{ path: 'openspec/changes/a/tasks.md', type: 'blob', sha: 's1' }],
    });
    octokit.rest.git.getBlob = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(loadTasksFiles(octokit, 'extenda/store')).rejects.toThrow(
      'boom',
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
