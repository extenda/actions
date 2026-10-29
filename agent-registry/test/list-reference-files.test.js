import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { listReferenceFiles } from '../src/register-skill.js';

// The workspace aliases fast-glob to an in-memory mock; load the real package instead.
vi.mock('fast-glob', () => ({
  default: createRequire(import.meta.url)('fast-glob'),
}));

// Uses the real filesystem and real fast-glob (no mocks).
describe('listReferenceFiles', () => {
  let root;
  let skillDir;

  const write = (rel, content = 'x') => {
    const file = path.join(skillDir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'skill-refs-'));
    skillDir = path.join(root, 'skill');
    mkdirSync(skillDir);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('returns nested files sorted, with posix relative paths', () => {
    write('SKILL.md');
    write('references/usage.md');
    write('references/templates/src/__PKG__/A.java');
    expect(listReferenceFiles(skillDir)).toEqual([
      'references/templates/src/__PKG__/A.java',
      'references/usage.md',
    ]);
  });

  test('includes dotfiles', () => {
    write('references/templates/.gitignore');
    expect(listReferenceFiles(skillDir)).toEqual([
      'references/templates/.gitignore',
    ]);
  });

  test('excludes top-level SKILL.md and .DS_Store but keeps nested SKILL.md', () => {
    write('SKILL.md');
    write('.DS_Store');
    write('references/.DS_Store');
    write('references/SKILL.md');
    expect(listReferenceFiles(skillDir)).toEqual(['references/SKILL.md']);
  });

  test('skips symlinked files and directories', () => {
    write('references/real.md');
    writeFileSync(path.join(root, 'outside.txt'), 'secret');
    mkdirSync(path.join(root, 'outsidedir'));
    writeFileSync(path.join(root, 'outsidedir', 'a.txt'), 'secret');
    symlinkSync(
      path.join(root, 'outside.txt'),
      path.join(skillDir, 'references', 'link.txt'),
    );
    symlinkSync(
      path.join(root, 'outsidedir'),
      path.join(skillDir, 'references', 'dirlink'),
    );
    expect(listReferenceFiles(skillDir)).toEqual(['references/real.md']);
  });
});
