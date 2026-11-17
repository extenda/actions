// Ported 1:1 from hiiretail-payments-connector-nexi-pos .github/actions/spec-first/test.sh (the spec of this
// action). The bash `key` and `check` subcommands map to keyFromTitle and checkKey; set-key.sh (the workflow
// step that fails on a keyless feat title and writes the key to GITHUB_OUTPUT) maps to the action itself.
import { describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');

import * as core from '@actions/core';

import { keyFromTitle } from '../../openspec-guard/src/tasks-md.js';
import { checkKey } from '../src/check.js';

const files = [
  {
    path: 'openspec/changes/hicc-1-a/tasks.md',
    content: `## 1. other-repo: Store work (HICC-11)
- [ ] 1.1 x
## 2. my-repo: Service work (HICC-12)
- [ ] 2.1 x
## 3. my-service: Old service-name heading (HICC-13)
- [ ] 3.1 x
`,
  },
  {
    path: 'openspec/changes/archive/2026-01-01-hicc-2-b/tasks.md',
    content: `## 1. my-repo: Archived work (HICC-20)
- [x] 1.1 x
`,
  },
  {
    path: 'openspec/changes/hicc-3-c/tasks.md',
    content: `## 1. my-repo: One (HICC-30)
## 2. my-repo: Two (HICC-30)
## 3. other-repo: Three (HICC-31)
`,
  },
];

// c <expected-exit> <key> [expected warning: w = a warning, n = none]
const c = (wantOk, key, warning) => {
  test(`check ${key}${warning ? ` (warning ${warning})` : ''}`, () => {
    const r = checkKey(files, key, 'my-repo');
    expect(r.ok).toBe(wantOk);
    if (warning) {
      expect(r.warnings.length > 0 ? 'w' : 'n').toBe(warning);
    }
  });
};

describe('spec-first check: the key alone picks the group; a heading naming another repo only warns', () => {
  c(true, 'HICC-12', 'n');
  c(true, 'hicc-12', 'n');
  c(true, 'HICC-20', 'n');
  c(true, 'HICC-13', 'w');
  c(true, 'HICC-11', 'w');
  c(false, 'HICC-99');
  c(false, 'HICC-30');
  c(true, 'HICC-31', 'w');
});

describe('spec-first key: only a feat title needs its key as scope; fix and every other type pass without one', () => {
  // k <expected-exit> <expected-key> <title>; exit 1 is status "missing", exit 0 with a key is "key",
  // exit 0 without one is "skip".
  const k = (code, key, title) =>
    test(`key ${JSON.stringify(title)}`, () => {
      const r = keyFromTitle(title);
      if (code === 1) {
        expect(r.status).toBe('missing');
      } else if (key) {
        expect(r).toEqual({ status: 'key', key });
      } else {
        expect(r.status).toBe('skip');
      }
    });
  k(0, 'HICC-12', 'feat(HICC-12): Add x');
  k(0, 'HICC-12', 'FEAT(hicc-12)!: Break z');
  k(1, '', 'feat: no scope');
  k(1, '', 'feat(parser): not a key');
  k(1, '', 'feat(HICC-12, other): two scopes');
  k(0, '', 'fix: no scope');
  k(0, '', 'fix(parser): not a key');
  k(0, '', 'fix(HICC-12): A fix key is not checked');
  k(0, '', 'chore(deps): Bump x');
  k(0, '', 'chore: Tidy');
  k(0, '', 'docs: Update readme');
  k(0, '', 'test(HICC-12): More tests');
  k(0, '', 'Add something');
});

describe('spec-first extra cases beyond the bash self-test', () => {
  test('an empty store has no group for the key', () => {
    const r = checkKey([], 'HICC-1', 'my-repo');
    expect(r.ok).toBe(false);
  });

  test('a store with changes but no matching group names the key', () => {
    const r = checkKey(files, 'HICC-99', 'my-repo');
    expect(r.errors[0]).toContain(
      "No change in the store has a group '## <n>. <repo>: <title> (HICC-99)'",
    );
  });

  test('a malformed heading is not a match', () => {
    const bad = [
      '## 1. my-repo: Title (HICC-50) trailing',
      '## 1. my repo: Title (HICC-51)',
      '## 1. my-repo Title (HICC-52)',
      '## 1. extenda/my-repo: Title (HICC-53)',
      '## 1. -x: Title (HICC-54)',
      '## 1. my-repo: (HICC-55)',
    ];
    const f = [
      { path: 'openspec/changes/z/tasks.md', content: `${bad.join('\n')}\n` },
    ];
    for (const n of [50, 51, 52, 53, 54, 55]) {
      expect(checkKey(f, `HICC-${n}`, 'my-repo').ok).toBe(false);
    }
  });

  test('several groups are listed', () => {
    const r = checkKey(files, 'HICC-30', 'my-repo');
    expect(r.errors.join('\n')).toContain('HICC-30 is in 2 group headings');
    expect(r.errors.join('\n')).toContain(
      'openspec/changes/hicc-3-c/tasks.md: ## 1. my-repo: One (HICC-30)',
    );
  });

  test('the success message names the group and the warning names both repos', () => {
    const r = checkKey(files, 'HICC-13', 'my-repo');
    expect(r.message).toBe(
      'Spec first: HICC-13 is covered by openspec/changes/hicc-1-a/tasks.md: ## 3. my-service: Old service-name heading (HICC-13)',
    );
    expect(r.warnings).toEqual([
      "The group heading names 'my-service', this repo is 'my-repo'.",
    ]);
  });
});

// o <expected-exit> <expected-output-line> <title>: the action step of set-key.sh.
describe('spec-first action step (set-key.sh)', async () => {
  const { runSpecFirst } = await import('../src/index.js');
  const store = { loadTasksFiles: vi.fn().mockResolvedValue(files) };
  const o = (failed, output, title) =>
    test(`set-key ${JSON.stringify(title)}`, async () => {
      vi.resetAllMocks();
      store.loadTasksFiles.mockResolvedValue(files);
      await runSpecFirst({ title, repo: 'my-repo', store, storeRepo: 'x/y' });
      expect(core.setFailed.mock.calls.length > 0).toBe(failed);
      const keyOutput = core.setOutput.mock.calls.find((a) => a[0] === 'key');
      expect(keyOutput ? keyOutput[1] : undefined).toBe(output);
    });
  o(true, undefined, 'feat: no scope');
  o(false, '', 'fix(parser): not a key');
  o(false, '', 'fix: no scope');
  o(false, 'HICC-12', 'feat(HICC-12): Add x');
  o(false, '', 'chore: Tidy');

  test('non-feat titles do not read the store', async () => {
    vi.resetAllMocks();
    store.loadTasksFiles.mockClear();
    await runSpecFirst({
      title: 'fix: x',
      repo: 'my-repo',
      store,
      storeRepo: 'x/y',
    });
    expect(store.loadTasksFiles).not.toHaveBeenCalled();
  });

  test('a failing check fails the action and a warning is a warning', async () => {
    vi.resetAllMocks();
    store.loadTasksFiles.mockResolvedValue(files);
    await runSpecFirst({
      title: 'feat(HICC-99): x',
      repo: 'my-repo',
      store,
      storeRepo: 'x/y',
    });
    expect(core.setFailed).toHaveBeenCalled();
    vi.resetAllMocks();
    store.loadTasksFiles.mockResolvedValue(files);
    await runSpecFirst({
      title: 'feat(HICC-13): x',
      repo: 'my-repo',
      store,
      storeRepo: 'x/y',
    });
    expect(core.setFailed).not.toHaveBeenCalled();
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('my-service'),
    );
  });
});
