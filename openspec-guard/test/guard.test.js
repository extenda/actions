// Ported 1:1 from experience-cardpayment-common scripts/openspec-guard.test.sh (the spec of this action),
// plus the extra cases at the bottom for behaviour that the bash self-test did not cover.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import { runGuard } from '../src/guard.js';

const sh = (cwd, cmd, args) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' });
const git = (cwd, ...args) => sh(cwd, 'git', args);

let tmp;
let repo;

const write = (rel, content) => {
  const f = path.join(repo, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

// new_repo: base commit on main with the store, the service list and an approved change `hicc-1-old`.
const newRepo = () => {
  repo = path.join(tmp, 'r');
  fs.rmSync(repo, { recursive: true, force: true });
  fs.mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '-b', 'main');
  git(repo, 'config', 'user.email', 't@t');
  git(repo, 'config', 'user.name', 't');
  git(repo, 'config', 'commit.gpgsign', 'false');
  git(repo, 'config', 'core.hooksPath', '/dev/null');
  write('.openspec-store/store.yaml', 'version: 1\nid: hiiconnect\n');
  write(
    '.agent/discovered.md',
    '# Discovered\n\n- **Repo:** experience-cardpayment-common\n\n### Other services in this clan\n\n- hiiconnect-router\n- payment-router\n- hps-nets\n- payment-router-ui\n\n### Fetch\n',
  );
  write(
    'openspec/changes/hicc-1-old/tasks.md',
    '## 1. payment-router: Old (HICC-2)\n\n- [ ] 1.1 a\n- [] 1.2 b\n',
  );
  write('.gitignore', '*.zip\n');
  write('openspec/changes/archive/.gitkeep', '');
  write('openspec/specs/.gitkeep', '');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-q', '-m', 'base');
  git(repo, 'checkout', '-q', '-b', 'feat/x');
};

const guard = (opts = {}) =>
  runGuard({
    cwd: repo,
    base: 'main',
    branch: 'feat/x',
    draft: false,
    clanPrefix: 'cardpayment-',
    ...opts,
  });

const ok = (r) => r.failures.length === 0;
const show = (r) => JSON.stringify(r.failures);

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-guard-'));
});
afterAll(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const six =
  '- [ ] 1.1 a\n- [ ] 1.2 b\n- [ ] 1.3 c\n- [ ] 1.4 d\n- [ ] 1.5 e\n- [ ] 1.6 f\n';
const good =
  '## 1. payment-router: Do it (HICC-3)\n\n- [ ] 1.1 a\n\n## 2. hps-nets: More (HICC-4)\n\n- [ ] 2.1 b\n';
const hdr = '## 1. payment-router: Do it (HICC-3)\n\n';

// case_ <name> <expected rc> <draft> <tasks.md body> <spec folder or "-">
const caseOf = (name, wantOk, draft, tasks, spec, extra) => {
  test(name, () => {
    newRepo();
    const d = 'openspec/changes/hicc-9-new';
    write(`${d}/tasks.md`, tasks);
    if (spec !== '-') {
      write(`${d}/specs/${spec}/spec.md`, 'spec\n');
    }
    if (extra) {
      extra();
    }
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'change');
    const r = guard({ draft });
    expect(ok(r), show(r)).toBe(wantOk);
  });
};

const widenedList = () =>
  write(
    '.agent/discovered.md',
    '# Discovered\n\n### Other services in this clan\n\n- payment-router\n- hiiconnect\n- anything\n',
  );

describe('openspec-guard: tasks.md and spec names of an unapproved change', () => {
  caseOf('valid change', true, false, good, 'payment-router-refunds');
  caseOf('six tasks', true, false, `${hdr}${six}`, 'cardpayment-refunds');
  caseOf(
    'seven tasks',
    false,
    false,
    `${hdr}${six}- [ ] 1.7 g\n`,
    'cardpayment-refunds',
  );
  caseOf(
    'no key',
    false,
    false,
    '## 1. payment-router: Do it\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo with owner',
    false,
    false,
    '## 1. extenda/payment-router: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'two repos in a group',
    false,
    false,
    '## 1. payment-router, hps-nets: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo not on the clan list',
    true,
    false,
    '## 1. hiiretail-payments-connector-nexi-pos: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo with dots and caps',
    true,
    false,
    '## 1. Some.Repo_x-1: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo name .',
    false,
    false,
    '## 1. .: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo name ..',
    false,
    false,
    '## 1. ..: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'repo name -x',
    false,
    false,
    '## 1. -x: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'plus bullet counts',
    false,
    false,
    `${hdr}${six}+ [ ] 1.7 g\n`,
    'cardpayment-refunds',
  );
  caseOf(
    'numbered task counts',
    false,
    false,
    `${hdr}${six}1. [ ] 1.7 g\n`,
    'cardpayment-refunds',
  );
  caseOf(
    'plus task outside a group',
    false,
    false,
    '+ [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'empty box with a link counts',
    false,
    false,
    `${hdr}${six}- [ ](x) 1.7\n`,
    'cardpayment-refunds',
  );
  caseOf(
    'link is not a task',
    true,
    false,
    `${hdr}${six}- [docs](x) here\n`,
    'cardpayment-refunds',
  );
  caseOf(
    'PR cannot widen the list',
    false,
    false,
    good,
    'hiiconnect-refunds',
    widenedList,
  );
  caseOf(
    'group numbering',
    false,
    false,
    '## 2. payment-router: Do it (HICC-3)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'task outside a group',
    false,
    false,
    '- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'TBD on a ready PR',
    false,
    false,
    '## 1. payment-router: Do it (TBD)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf(
    'TBD on a draft PR',
    true,
    true,
    '## 1. payment-router: Do it (TBD)\n\n- [ ] 1.1 a\n',
    'payment-router-x',
  );
  caseOf('store id as prefix', false, false, good, 'hiiconnect-refunds');
  caseOf(
    'service named like the store',
    true,
    false,
    good,
    'hiiconnect-router-refunds',
  );
  // The store id is never a prefix, whatever the clan prefix says.
  describe.each(['hiiconnect-', 'hiiconnect', 'hiiconnect-x'])(
    'clan prefix %j',
    (clanPrefix) => {
      test('does not admit the store id as a prefix', () => {
        newRepo();
        write('openspec/changes/hicc-9-new/tasks.md', good);
        write(
          'openspec/changes/hicc-9-new/specs/hiiconnect-refunds/spec.md',
          'x\n',
        );
        git(repo, 'add', '-A');
        git(repo, 'commit', '-q', '-m', 'change');
        const r = guard({ clanPrefix });
        expect(ok(r), show(r)).toBe(false);
        expect(show(r)).toContain('never the store id hiiconnect');
      });
      test('still admits a service that starts with the id', () => {
        newRepo();
        write('openspec/changes/hicc-9-new/tasks.md', good);
        write(
          'openspec/changes/hicc-9-new/specs/hiiconnect-router-refunds/spec.md',
          'x\n',
        );
        git(repo, 'add', '-A');
        git(repo, 'commit', '-q', '-m', 'change');
        const r = guard({ clanPrefix });
        expect(ok(r), show(r)).toBe(true);
      });
    },
  );
  caseOf('unknown service prefix', false, false, good, 'foo-refunds');
  caseOf('bare service name', false, false, good, 'payment-router');
  caseOf(
    'bare name with service prefix',
    false,
    false,
    good,
    'payment-router-ui',
  );
  caseOf('files only in specs/', true, false, good, '-', () =>
    write('openspec/changes/hicc-9-new/specs/note.md', 'x\n'),
  );
  caseOf('no specs', true, false, good, '-');
});

const tickAll = (file) => {
  const f = path.join(repo, file);
  const text = fs
    .readFileSync(f, 'utf8')
    .split('\n')
    .map((l) => l.replace('[ ]', '[x]').replace('[]', '[x]'))
    .join('\n');
  fs.writeFileSync(f, text);
};

describe('openspec-guard: approved change', () => {
  // An approved change is frozen: ticking is fine and is not re-checked against the heading rules.
  test('ticking an approved change', () => {
    newRepo();
    git(repo, 'checkout', '-q', 'main');
    git(repo, 'checkout', '-q', '-b', 'feat/y');
    tickAll('openspec/changes/hicc-1-old/tasks.md');
    git(repo, 'commit', '-q', '-am', 'tick');
    const r = guard({ branch: 'feat/y' });
    expect(ok(r), show(r)).toBe(true);
  });
});

describe('openspec-guard: archive branch (stub openspec)', () => {
  let bin;
  beforeAll(() => {
    // Archive moves the change and writes a spec. With STUB_ZIP it also writes a *.zip, which the fixture
    // .gitignore hides; the guard must say so, not skip it.
    bin = path.join(tmp, 'bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(
      path.join(bin, 'openspec'),
      `#!/bin/bash
[ "$1" = archive ] || exit 0
mkdir -p openspec/changes/archive openspec/specs/cap
mv "openspec/changes/$2" "openspec/changes/archive/2026-01-01-$2"
echo spec >openspec/specs/cap/spec.md
[ -z "$STUB_ZIP" ] || echo z >openspec/specs/cap/diagram.zip
`,
      { mode: 0o755 },
    );
  });
  afterEach(() => {
    delete process.env.STUB_ZIP;
  });

  const archiveCase = (name, wantOk, zip) => {
    test(name, () => {
      newRepo();
      git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
      tickAll('openspec/changes/hicc-1-old/tasks.md');
      if (zip) {
        process.env.STUB_ZIP = zip;
      }
      sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
      git(repo, 'add', '-A', '-f');
      git(repo, 'commit', '-q', '-m', 'archive');
      const r = guard({
        branch: 'chore/archive-hicc-1-old',
        openspecCommand: [path.join(bin, 'openspec')],
      });
      expect(ok(r), show(r)).toBe(wantOk);
      if (zip) {
        expect(show(r)).toContain('gitignore hides');
      }
    });
  };
  archiveCase('archive matches the recompute', true, '');
  archiveCase('archive with an ignored file', false, '1');

  // Extra cases, not in the bash self-test.
  test('archive with unticked tasks', () => {
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
    git(repo, 'add', '-A', '-f');
    git(repo, 'commit', '-q', '-m', 'archive');
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(show(r)).toContain('Archived with unticked tasks.');
  });

  test('archive that differs from the recompute', () => {
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    tickAll('openspec/changes/hicc-1-old/tasks.md');
    sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
    write('openspec/specs/cap/spec.md', 'tampered\n');
    git(repo, 'add', '-A', '-f');
    git(repo, 'commit', '-q', '-m', 'archive');
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(r.failures.map((f) => f.file)).toEqual([
      'openspec/specs/cap/spec.md',
    ]);
    expect(show(r)).toContain('Differs from openspec archive hicc-1-old.');
  });

  test('archive date may differ from the recompute', () => {
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    tickAll('openspec/changes/hicc-1-old/tasks.md');
    sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
    fs.renameSync(
      path.join(repo, 'openspec/changes/archive/2026-01-01-hicc-1-old'),
      path.join(repo, 'openspec/changes/archive/2025-12-31-hicc-1-old'),
    );
    git(repo, 'add', '-A', '-f');
    git(repo, 'commit', '-q', '-m', 'archive');
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(ok(r), show(r)).toBe(true);
  });

  test('archive of a change that is not on the base', () => {
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-nope');
    write('openspec/changes/nope/tasks.md', '## 1. a: b (HICC-1)\n');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'x');
    const r = guard({
      branch: 'chore/archive-nope',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(show(r)).toContain('nope is not an open change on main.');
  });

  test('archive when openspec fails on the base', () => {
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    write('x.txt', 'x\n');
    write('openspec/specs/s/spec.md', 'x\n');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'x');
    const failing = path.join(tmp, 'bin', 'failing');
    fs.writeFileSync(failing, '#!/bin/bash\nexit 3\n', { mode: 0o755 });
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [failing],
    });
    expect(show(r)).toContain('openspec archive hicc-1-old fails on main.');
  });
});

describe('openspec-guard: extra cases beyond the bash self-test', () => {
  const commit = () => {
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'change');
  };

  test('nothing under openspec changed passes without checks', () => {
    newRepo();
    write('README.md', 'x\n');
    commit();
    const r = guard();
    expect(ok(r), show(r)).toBe(true);
    expect(r.skipped).toBe(true);
  });

  test('an unresolvable base cannot pass', () => {
    newRepo();
    expect(() => guard({ base: 'origin/nope' })).toThrow(/Cannot resolve/);
  });

  test('an approved change cannot change its proposal', () => {
    newRepo();
    write('openspec/changes/hicc-1-old/proposal.md', 'x\n');
    commit();
    const r = guard();
    expect(show(r)).toContain('frozen');
  });

  test('an approved change cannot add to a spec delta', () => {
    newRepo();
    write('openspec/changes/hicc-1-old/specs/a/spec.md', 'x\n');
    commit();
    expect(show(guard())).toContain('frozen');
  });

  test('an approved tasks.md cannot change other than by ticks', () => {
    newRepo();
    write(
      'openspec/changes/hicc-1-old/tasks.md',
      '## 1. payment-router: Old (HICC-2)\n\n- [x] 1.1 changed\n- [] 1.2 b\n',
    );
    commit();
    expect(show(guard())).toContain('tasks.md may only tick boxes');
  });

  test('an approved tasks.md cannot be deleted', () => {
    newRepo();
    fs.rmSync(path.join(repo, 'openspec/changes/hicc-1-old/tasks.md'));
    commit();
    expect(show(guard())).toContain('tasks.md may only tick boxes');
  });

  test('living specs and the archive change only on archive branches', () => {
    newRepo();
    write('openspec/specs/cap/spec.md', 'x\n');
    write('openspec/changes/archive/2026-01-01-z/tasks.md', 'x\n');
    commit();
    const r = guard();
    expect(r.failures.map((f) => f.file).sort()).toEqual([
      'openspec/changes/archive/2026-01-01-z/tasks.md',
      'openspec/specs/cap/spec.md',
    ]);
  });

  test('openspec/config.yaml is a free path', () => {
    newRepo();
    write('openspec/config.yaml', 'schema: spec-driven\n');
    commit();
    const r = guard();
    expect(ok(r), show(r)).toBe(true);
  });

  test('file type changes are refused', () => {
    newRepo();
    fs.rmSync(path.join(repo, 'openspec/changes/hicc-1-old/tasks.md'));
    fs.symlinkSync(
      'x',
      path.join(repo, 'openspec/changes/hicc-1-old/tasks.md'),
    );
    commit();
    const r = guard();
    expect(show(r)).toContain('File type changes are not allowed.');
    expect(show(r)).toContain('Only regular files are allowed here');
  });

  test('symlinks under openspec are refused', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', good);
    fs.symlinkSync(
      'tasks.md',
      path.join(repo, 'openspec/changes/hicc-9-new/link.md'),
    );
    commit();
    expect(show(guard())).toContain(
      'Only regular files are allowed here (mode 120000)',
    );
  });

  test('the store id comes from the base store.yaml unless set', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write('openspec/changes/hicc-9-new/specs/hiiconnect-x/spec.md', 'x\n');
    commit();
    expect(show(guard())).toContain('never the store id hiiconnect');
    expect(show(guard({ storeId: 'other' }))).toContain(
      'never the store id other',
    );
  });

  test('the store id is never a prefix, even when the clan prefix or the list says so', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write(
      'openspec/changes/hicc-9-new/specs/hiiconnect-refunds/spec.md',
      'x\n',
    );
    commit();
    expect(ok(guard({ clanPrefix: 'hiiconnect-' }))).toBe(false);
    expect(
      ok(guard({ clanPrefix: 'hiiconnect-', storeId: 'hiiconnect' })),
    ).toBe(false);
  });

  test('a service named like the store id gives no prefix, its longer siblings do', () => {
    newRepo();
    write(
      '.agent/discovered.md',
      '### Other services in this clan\n\n- hiiconnect\n- hiiconnect-router\n',
    );
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'list');
    git(repo, 'branch', '-f', 'main');
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write(
      'openspec/changes/hicc-9-new/specs/hiiconnect-refunds/spec.md',
      'x\n',
    );
    write(
      'openspec/changes/hicc-9-new/specs/hiiconnect-router-x/spec.md',
      'x\n',
    );
    commit();
    const r = guard({ clanPrefix: 'hiiconnect-' });
    expect(r.failures.map((f) => f.file)).toEqual([
      'openspec/changes/hicc-9-new/specs/hiiconnect-refunds',
    ]);
  });

  test('a clan without a prefix accepts only its services', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write('openspec/changes/hicc-9-new/specs/cardpayment-x/spec.md', 'x\n');
    commit();
    expect(ok(guard({ clanPrefix: '' }))).toBe(false);
    expect(ok(guard({ clanPrefix: 'cardpayment-' }))).toBe(true);
  });

  test('service list location and heading are inputs', () => {
    newRepo();
    write('docs/services.md', '### Our services\n\n- alpha\n');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'list');
    git(repo, 'branch', '-f', 'main');
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write('openspec/changes/hicc-9-new/specs/alpha-x/spec.md', 'x\n');
    write('openspec/changes/hicc-9-new/specs/payment-router-x/spec.md', 'x\n');
    commit();
    const r = guard({
      servicesFile: 'docs/services.md',
      servicesHeading: 'Our services',
    });
    expect(r.failures.map((f) => f.file)).toEqual([
      'openspec/changes/hicc-9-new/specs/payment-router-x',
    ]);
  });

  test('the service list is only loaded when spec names are checked', () => {
    newRepo();
    git(repo, 'rm', '-q', '.agent/discovered.md');
    git(repo, 'commit', '-q', '-m', 'rm');
    git(repo, 'branch', '-f', 'main');
    write('openspec/changes/hicc-9-new/tasks.md', good);
    commit();
    expect(ok(guard())).toBe(true);
    write('openspec/changes/hicc-9-new/specs/a-x/spec.md', 'x\n');
    commit();
    expect(() => guard()).toThrow(/No \.agent\/discovered\.md on main/);
  });

  test('an empty service list cannot pass', () => {
    newRepo();
    write('.agent/discovered.md', '### Other services in this clan\n\n');
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'empty');
    git(repo, 'branch', '-f', 'main');
    write('openspec/changes/hicc-9-new/tasks.md', good);
    write('openspec/changes/hicc-9-new/specs/a-x/spec.md', 'x\n');
    commit();
    expect(() => guard()).toThrow(/No services found/);
  });

  test('a lower-case key is not a Jira key', () => {
    newRepo();
    write(
      'openspec/changes/hicc-9-new/tasks.md',
      '## 1. payment-router: Do it (hicc-3)\n\n- [ ] 1.1 a\n',
    );
    commit();
    expect(show(guard())).toContain('is not a Jira key');
  });

  test('a change without any group heading fails', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', 'nothing\n');
    commit();
    expect(show(guard())).toContain('no group heading found.');
  });

  test('a change already on the base is not re-checked as new', () => {
    newRepo();
    write('openspec/changes/hicc-1-old/design.md', 'x\n');
    commit();
    expect(show(guard())).not.toContain('Spec name');
  });
});

describe('openspec-guard: group keys across the store', () => {
  const commit = () => {
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'change');
  };
  const proposal = (key) =>
    `## 1. payment-router: Do it (${key})\n\n- [ ] 1.1 a\n`;

  test('a key of an open change on the base is rejected', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', proposal('HICC-2'));
    commit();
    const r = guard();
    expect(ok(r)).toBe(false);
    expect(show(r)).toContain(
      '\\"HICC-2\\" is already the key of a group in openspec/changes/hicc-1-old/tasks.md.',
    );
  });

  test('a key of an archived change on the base is rejected', () => {
    newRepo();
    write(
      'openspec/changes/archive/2020-01-01-gone/tasks.md',
      '## 1. payment-router: Old (HICC-77)\n\n- [x] 1.1 a\n',
    );
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'archived');
    git(repo, 'branch', '-f', 'main');
    write('openspec/changes/hicc-9-new/tasks.md', proposal('HICC-77'));
    commit();
    const r = guard();
    expect(ok(r)).toBe(false);
    expect(show(r)).toContain('already the key of a group in');
  });

  test('a key in two groups of the same tasks.md is rejected', () => {
    newRepo();
    write(
      'openspec/changes/hicc-9-new/tasks.md',
      `${proposal('HICC-5')}\n## 2. hps-nets: More (HICC-5)\n\n- [ ] 2.1 b\n`,
    );
    commit();
    const r = guard();
    expect(ok(r)).toBe(false);
    expect(show(r)).toContain('more than one group of this tasks.md');
  });

  test('a fresh key passes', () => {
    newRepo();
    write('openspec/changes/hicc-9-new/tasks.md', proposal('HICC-5'));
    commit();
    const r = guard();
    expect(ok(r), show(r)).toBe(true);
  });
});

describe('openspec-guard: archived folders of earlier changes', () => {
  test('an older archive/<date>-<change> on the base is ignored', () => {
    const bin = path.join(tmp, 'bin2');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(
      path.join(bin, 'openspec'),
      `#!/bin/bash
[ "$1" = archive ] || exit 0
mkdir -p openspec/changes/archive
mv "openspec/changes/$2" "openspec/changes/archive/2026-01-01-$2"
`,
      { mode: 0o755 },
    );
    newRepo();
    // The base already has a ticked archive of a change named like the one archived now.
    write(
      'openspec/changes/archive/2020-01-01-hicc-1-old/tasks.md',
      '## 1. payment-router: Earlier (HICC-1)\n\n- [x] 1.1 a\n',
    );
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'earlier archive');
    git(repo, 'branch', '-f', 'main');
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
    git(repo, 'add', '-A', '-f');
    git(repo, 'commit', '-q', '-m', 'archive');
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(ok(r)).toBe(false);
    expect(show(r)).toContain('Archived with unticked tasks.');
  });

  test('several new archived folders of the change fail', () => {
    const bin = path.join(tmp, 'bin3');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(
      path.join(bin, 'openspec'),
      `#!/bin/bash
[ "$1" = archive ] || exit 0
mkdir -p openspec/changes/archive
mv "openspec/changes/$2" "openspec/changes/archive/2026-01-01-$2"
`,
      { mode: 0o755 },
    );
    newRepo();
    git(repo, 'checkout', '-q', '-b', 'chore/archive-hicc-1-old');
    tickAll('openspec/changes/hicc-1-old/tasks.md');
    sh(repo, path.join(bin, 'openspec'), ['archive', 'hicc-1-old', '--yes']);
    fs.cpSync(
      path.join(repo, 'openspec/changes/archive/2026-01-01-hicc-1-old'),
      path.join(repo, 'openspec/changes/archive/2025-12-31-hicc-1-old'),
      { recursive: true },
    );
    git(repo, 'add', '-A', '-f');
    git(repo, 'commit', '-q', '-m', 'archive');
    const r = guard({
      branch: 'chore/archive-hicc-1-old',
      openspecCommand: [path.join(bin, 'openspec')],
    });
    expect(ok(r)).toBe(false);
    expect(show(r)).toContain('2 new archived folders on the branch');
  });
});

describe('openspec-guard: approved() is memoized', () => {
  test('a change touching several files spawns cat-file once', () => {
    newRepo();
    const calls = [];
    const wrapper = path.join(tmp, 'git-count');
    fs.writeFileSync(
      wrapper,
      `#!/bin/bash\nfor a in "$@"; do [ "$a" = cat-file ] && echo x >>"${path.join(tmp, 'catfile.log')}"; done\nexec git "$@"\n`,
      { mode: 0o755 },
    );
    for (const n of ['a', 'b', 'c', 'd']) {
      write(`openspec/changes/hicc-1-old/${n}.md`, 'x\n');
    }
    git(repo, 'add', '-A');
    git(repo, 'commit', '-q', '-m', 'change');
    const r = guard({ gitBin: wrapper });
    expect(show(r)).toContain('frozen');
    const lines = fs.readFileSync(path.join(tmp, 'catfile.log'), 'utf8');
    calls.push(...lines.trim().split('\n'));
    expect(calls).toHaveLength(1);
    fs.rmSync(path.join(tmp, 'catfile.log'));
  });
});
