import { afterEach, describe, expect, test } from 'vitest';

import * as changes from '../src/conventionalchanges.js';

describe('conventionalchanges', () => {
  afterEach(() => {
    changes.setCommitPath('');
  });

  test('returns commits and a valid bump type when no path is set', async () => {
    const commits = await changes.getConventionalCommits();
    const bump = await changes.getRecommendedBump();

    expect(commits.length).toBeGreaterThan(0);
    expect(['major', 'minor', 'patch']).toContain(bump);
  });

  test('returns no commits for a non-existent path, proving path is forwarded', async () => {
    changes.setCommitPath('this-path-does-not-exist-xyz');

    const commits = await changes.getConventionalCommits();

    expect(commits).toEqual([]);
  });
});
