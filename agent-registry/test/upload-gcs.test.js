import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload, uploadMany } from '../src/upload-gcs.js';

describe('upload-gcs', () => {
  let src;

  beforeEach(() => {
    src = mkdtempSync(path.join(tmpdir(), 'upload-gcs-test-'));
  });

  afterEach(() => {
    vi.resetAllMocks();
    rmSync(src, { recursive: true, force: true });
  });

  test('upload copies one file', async () => {
    execGcloud.mockResolvedValue('');
    const dest = await upload('/a/b.md', 'x/y/b.md');
    expect(dest).toBe('gs://extenda-agent-artifacts/x/y/b.md');
    expect(execGcloud).toHaveBeenCalledWith(
      ['storage', 'cp', '/a/b.md', dest],
      'gcloud',
      true,
    );
  });

  test('uploadMany rsyncs a staged tree that mirrors the relative paths', async () => {
    mkdirSync(path.join(src, 'references/templates/a'), { recursive: true });
    writeFileSync(path.join(src, 'SKILL.md'), 'skill');
    writeFileSync(path.join(src, 'references/usage.md'), 'usage');
    writeFileSync(path.join(src, 'references/templates/a/B.java'), 'java');
    writeFileSync(path.join(src, 'references/.hidden'), 'dot');

    const rels = [
      'SKILL.md',
      'references/usage.md',
      'references/templates/a/B.java',
      'references/.hidden',
    ];
    let staged;
    let stage;
    execGcloud.mockImplementation(async (args) => {
      [, , , stage] = args;
      staged = Object.fromEntries(
        rels.map((r) => [r, readFileSync(path.join(stage, r), 'utf8')]),
      );
      return '';
    });

    const dest = await uploadMany(
      rels.map((relPath) => ({ localPath: path.join(src, relPath), relPath })),
      'skills/clan-s/v0-01',
    );

    expect(dest).toBe('gs://extenda-agent-artifacts/skills/clan-s/v0-01');
    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith(
      ['storage', 'rsync', '-r', stage, dest],
      'gcloud',
      true,
    );
    expect(staged).toEqual({
      'SKILL.md': 'skill',
      'references/usage.md': 'usage',
      'references/templates/a/B.java': 'java',
      'references/.hidden': 'dot',
    });
    expect(existsSync(stage)).toBe(false);
  });

  test('uploadMany removes the staging dir and rethrows when gcloud fails', async () => {
    writeFileSync(path.join(src, 'SKILL.md'), 'skill');
    let stage;
    execGcloud.mockImplementation(async (args) => {
      [, , , stage] = args;
      throw new Error('gcs down');
    });
    await expect(
      uploadMany(
        [{ localPath: path.join(src, 'SKILL.md'), relPath: 'SKILL.md' }],
        'p',
      ),
    ).rejects.toThrow('gcs down');
    expect(existsSync(stage)).toBe(false);
  });
});
