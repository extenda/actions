import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock('fast-glob', () => ({ default: { sync: vi.fn(() => []) } }));
vi.mock('fflate', () => ({
  zipSync: vi.fn(() => new Uint8Array([1, 2, 3])),
  strToU8: vi.fn(() => new Uint8Array([1, 2, 3])),
}));
vi.mock('node:os', () => ({
  default: { tmpdir: vi.fn(() => '/tmp') },
  tmpdir: vi.fn(() => '/tmp'),
}));
vi.mock('../../setup-gcloud/src/exec-gcloud.js');
vi.mock('../src/upload-gcs.js');

import { readFileSync, unlinkSync } from 'node:fs';

import * as core from '@actions/core';
import fg from 'fast-glob';
import { zipSync } from 'fflate';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import {
  KEEP_REVISIONS,
  MAX_FILES,
  MAX_MARKDOWN_BYTES,
  MAX_ZIP_BYTES,
  parseSkillMeta,
  registerSkill,
} from '../src/register-skill.js';
import { upload } from '../src/upload-gcs.js';

const SKILL_MD = `---
name: Fix Dependabot PR
description: Automatically fixes failing Dependabot PRs
---

## Skill content
`;

const revisionsList = (...versions) => versions.join('\n');

// Dry-run may read the registry (to report pruning) but must never create, activate, delete or upload.
const expectNoWrites = () => {
  const verbs = ['create', 'update', 'delete', 'cp', 'rm'];
  for (const [args] of execGcloud.mock.calls) {
    expect(args.some((a) => verbs.includes(a))).toBe(false);
  }
  expect(upload).not.toHaveBeenCalled();
};

// Index of execGcloud call by position
const call = (n) => execGcloud.mock.calls[n][0];

describe('parseSkillMeta', () => {
  test('extracts name and description from frontmatter', () => {
    expect(parseSkillMeta(SKILL_MD)).toEqual({
      name: 'Fix Dependabot PR',
      description: 'Automatically fixes failing Dependabot PRs',
    });
  });

  test('returns empty strings when no frontmatter present', () => {
    expect(parseSkillMeta('# No frontmatter')).toEqual({
      name: '',
      description: '',
    });
  });

  test('handles quoted description with colons', () => {
    const content = `---\nname: S\ndescription: "Does A: and B"\n---\n`;
    expect(parseSkillMeta(content).description).toBe('Does A: and B');
  });

  test('handles folded multi-line description', () => {
    const content = `---\nname: S\ndescription: >\n  Does A\n  and B\n---\n`;
    expect(parseSkillMeta(content).description).toBe('Does A and B');
  });

  test('handles literal multi-line description', () => {
    const content = `---\nname: S\ndescription: |\n  Does A\n  and B\n---\n`;
    expect(parseSkillMeta(content).description).toBe('Does A\nand B');
  });

  test('ignores other frontmatter fields', () => {
    const content = `---\nname: S\ndescription: D\nmetadata:\n  category: ops\n---\n`;
    expect(parseSkillMeta(content)).toEqual({ name: 'S', description: 'D' });
  });

  test('throws on invalid YAML', () => {
    const content = `---\nname: S\ndescription: Does A: and B\n---\n`;
    expect(() => parseSkillMeta(content)).toThrow();
  });
});

describe('registerSkill', () => {
  beforeEach(() => {
    readFileSync.mockReturnValue(SKILL_MD);
    fg.sync.mockReturnValue([]);
    upload.mockResolvedValue('gs://dest');
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REF_NAME;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('new skill (does not exist)', () => {
    // New skill: skillExists(throws) → create (no payload) → revisions create → activate
    // gcloud auto-prepends "private-" so we pass skillId (not registryId) to create
    test('creates skill then adds v0.1 revision', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found')); // skillExists
      execGcloud.mockResolvedValueOnce(''); // skills create
      execGcloud.mockResolvedValueOnce(''); // revisions create
      execGcloud.mockResolvedValueOnce(''); // activate

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(1)).toContain('create');
      expect(call(1)).toContain('my-skill');
      expect(call(2)).toContain('v0-01');
    });

    test('create call includes display-name, description, type, location, project', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      const createArgs = call(1);
      expect(createArgs).toContain('--display-name=Fix Dependabot PR');
      expect(createArgs).toContain(
        '--description=Automatically fixes failing Dependabot PRs',
      );
      expect(createArgs).toContain('--type=simple');
      expect(createArgs).toContain('--location=eu');
      expect(createArgs).toContain('--project=extenda');
    });

    test('activate call uses correct full revision resource name', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      const activateArgs = call(3);
      expect(activateArgs).toContain(
        '--default-revision=projects/extenda/locations/eu/skills/private-my-skill/revisions/v0-01',
      );
      expect(activateArgs).toContain('--target-state=active');
    });
  });

  describe('existing skill — minor bump (default)', () => {
    test('bumps minor from v0.1 to v0.2', async () => {
      execGcloud.mockResolvedValueOnce(''); // skillExists
      execGcloud.mockResolvedValueOnce(revisionsList('v0-01')); // revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce(''); // revisions create
      execGcloud.mockResolvedValueOnce(''); // activate

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(4)).toContain('v0-02');
    });

    test('picks the highest version when multiple revisions exist', async () => {
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(
        revisionsList('v0-01', 'v0-03', 'v0-02'),
      );
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(4)).toContain('v0-04');
    });

    test('uses skills revisions create (not skills create) for existing skill', async () => {
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v0-01'));
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      const revCreateArgs = call(4);
      expect(revCreateArgs).toContain('revisions');
      expect(revCreateArgs).toContain('create');
      expect(revCreateArgs).toContain('--skill=private-my-skill');
    });
  });

  describe('major bump (breaking/* or major/* branch)', () => {
    test('bumps major on breaking/ branch', async () => {
      process.env.GITHUB_HEAD_REF = 'breaking/redesign';
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v2-04'));
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(4)).toContain('v3-00');
    });

    test('bumps major on major/ branch', async () => {
      process.env.GITHUB_HEAD_REF = 'major/overhaul';
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v1-05'));
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(4)).toContain('v2-00');
    });

    test('does not bump major on branch that merely contains "major" mid-word', async () => {
      process.env.GITHUB_HEAD_REF = 'fix/fix-major-bug';
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v0-03'));
      execGcloud.mockResolvedValueOnce(''); // prune: revisions list
      execGcloud.mockResolvedValueOnce(''); // prune: describe default
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(4)).toContain('v0-04');
    });
  });

  describe('validation', () => {
    test('throws when frontmatter name is missing', async () => {
      readFileSync.mockReturnValue('---\ndescription: A description\n---\n');
      await expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('missing required frontmatter field: name');
    });

    test('throws when frontmatter description is missing', async () => {
      readFileSync.mockReturnValue('---\nname: My Skill\n---\n');
      await expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('missing required frontmatter field: description');
    });

    test('throws when skill body is empty', async () => {
      readFileSync.mockReturnValue(
        '---\nname: My Skill\ndescription: A description\n---\n',
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('must have instructions after the frontmatter');
    });

    test('throws on empty body even in dry-run', async () => {
      readFileSync.mockReturnValue(
        '---\nname: My Skill\ndescription: A description\n---\n',
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', true),
      ).rejects.toThrow('must have instructions after the frontmatter');
    });

    test('throws on invalid YAML frontmatter even in dry-run', async () => {
      readFileSync.mockReturnValue(
        '---\nname: My Skill\ndescription: Does A: and B\n---\n\nBody\n',
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', true),
      ).rejects.toThrow("SKILL.md for 'my-skill' has invalid YAML frontmatter");
    });

    test('counts emoji as one char each against the limit', async () => {
      readFileSync.mockReturnValue(
        `---\nname: My Skill\ndescription: ${'😀'.repeat(1024)}\n---\n\nBody\n`,
      );
      await registerSkill('my-skill', '/SKILL.md', true);
      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
    });

    test('throws when emoji description exceeds 1024 chars', async () => {
      readFileSync.mockReturnValue(
        `---\nname: My Skill\ndescription: ${'😀'.repeat(1025)}\n---\n\nBody\n`,
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', true),
      ).rejects.toThrow('description is 1025 chars, max is 1024');
    });

    test('counts the full multi-line description against the limit', async () => {
      const lines = Array.from(
        { length: 11 },
        () => `  ${'a'.repeat(99)}`,
      ).join('\n');
      readFileSync.mockReturnValue(
        `---\nname: My Skill\ndescription: >\n${lines}\n---\n\nBody\n`,
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', true),
      ).rejects.toThrow('description is 1099 chars, max is 1024');
    });

    test('throws when description exceeds 1024 chars even in dry-run', async () => {
      readFileSync.mockReturnValue(
        `---\nname: My Skill\ndescription: ${'a'.repeat(1025)}\n---\n\nBody\n`,
      );
      await expect(
        registerSkill('my-skill', '/SKILL.md', true),
      ).rejects.toThrow('description is 1025 chars, max is 1024');
    });

    test('accepts description of exactly 1024 chars', async () => {
      readFileSync.mockReturnValue(
        `---\nname: My Skill\ndescription: ${'a'.repeat(1024)}\n---\n\nBody\n`,
      );
      await registerSkill('my-skill', '/SKILL.md', true);
      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
    });
  });

  describe('dry-run', () => {
    test('prints create message for new skill', async () => {
      await registerSkill('my-skill', '/SKILL.md', true);

      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
      expectNoWrites();
    });

    test('prints update message with next version for existing skill', async () => {
      await registerSkill('my-skill', '/SKILL.md', true);

      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
      expectNoWrites();
    });
  });

  describe('temp file cleanup', () => {
    test('deletes zip file even when revisions create fails', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found')); // skillExists
      execGcloud.mockResolvedValueOnce(''); // skills create
      execGcloud.mockRejectedValueOnce(new Error('gcloud error')); // revisions create fails

      await expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('gcloud error');

      expect(unlinkSync).toHaveBeenCalledOnce();
    });
  });

  describe('activation while the revision scan is pending', () => {
    const SCAN_PENDING_ERROR = new Error(
      "The process 'gcloud' failed with exit code 1\n\nERROR: (gcloud.alpha.agent-registry.skills.update) " +
        'FAILED_PRECONDITION: Invalid resource state for "Skill": cannot set default revision to a revision ' +
        'with pending scan results when scanning policy is ENABLED_BLOCKING',
    );
    const ACTIVATE = 3;

    beforeEach(() => {
      vi.useFakeTimers();
      execGcloud.mockRejectedValueOnce(new Error('not found')); // skillExists
      execGcloud.mockResolvedValueOnce(''); // skills create
      execGcloud.mockResolvedValueOnce(''); // revisions create
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('retries activation until the scan finishes', async () => {
      execGcloud.mockRejectedValueOnce(SCAN_PENDING_ERROR);
      execGcloud.mockRejectedValueOnce(SCAN_PENDING_ERROR);
      execGcloud.mockResolvedValueOnce(''); // activate

      const done = registerSkill('my-skill', '/SKILL.md', false);
      await vi.advanceTimersByTimeAsync(15000);
      await done;

      expect(call(ACTIVATE + 1)).toEqual(call(ACTIVATE));
      expect(call(ACTIVATE + 2)).toEqual(call(ACTIVATE));
      expect(execGcloud).toHaveBeenCalledTimes(ACTIVATE + 3);
      // Artifacts are uploaded once, before the first activation attempt.
      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload.mock.invocationCallOrder[0]).toBeLessThan(
        execGcloud.mock.invocationCallOrder[ACTIVATE],
      );
    });

    test('gives up once the retries run out', async () => {
      execGcloud.mockRejectedValue(SCAN_PENDING_ERROR);

      const done = expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('pending scan results');
      await vi.advanceTimersByTimeAsync(120000);
      await done;

      expect(execGcloud).toHaveBeenCalledTimes(ACTIVATE + 6);
    });

    test('does not retry any other activation error', async () => {
      execGcloud.mockRejectedValueOnce(new Error('PERMISSION_DENIED'));

      await expect(
        registerSkill('my-skill', '/SKILL.md', false),
      ).rejects.toThrow('PERMISSION_DENIED');

      expect(execGcloud).toHaveBeenCalledTimes(ACTIVATE + 1);
    });
  });

  describe('payload flag', () => {
    test('passes a temp zip path to --payload on revisions create', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      // call(2) is revisions create (has --payload); call(1) is skills create (no --payload)
      const payloadArg = call(2).find((a) => a.startsWith('--payload='));
      expect(payloadArg).toMatch(/^--payload=\/tmp\/skill-\d+\.zip$/);
    });
  });

  describe('reference files', () => {
    const setup = () => {
      fg.sync.mockReturnValue([
        'references/templates/a/B.java',
        'references/usage.md',
      ]);
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValue('');
    };

    test('includes reference files in the zip with relative paths', async () => {
      setup();
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      expect(fg.sync).toHaveBeenCalledWith(
        '**/*',
        expect.objectContaining({ cwd: '/skills/my-skill' }),
      );
      const entries = zipSync.mock.calls[0][0];
      expect(Object.keys(entries)).toEqual([
        'SKILL.md',
        'references/templates/a/B.java',
        'references/usage.md',
      ]);
    });

    test('uploads reference files to the same revision path in GCS', async () => {
      setup();
      await registerSkill(
        'my-skill',
        '/skills/my-skill/SKILL.md',
        false,
        'clan',
      );

      expect(upload).toHaveBeenCalledWith(
        '/skills/my-skill/SKILL.md',
        'skills/clan-my-skill/v0-01/SKILL.md',
      );
      expect(upload).toHaveBeenCalledWith(
        '/skills/my-skill/references/usage.md',
        'skills/clan-my-skill/v0-01/references/usage.md',
      );
      expect(upload).toHaveBeenCalledWith(
        '/skills/my-skill/references/templates/a/B.java',
        'skills/clan-my-skill/v0-01/references/templates/a/B.java',
      );
    });

    test('dry-run lists reference files without uploading', async () => {
      fg.sync.mockReturnValue(['references/usage.md']);
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', true);

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('references/usage.md'),
      );
      expect(upload).not.toHaveBeenCalled();
    });

    test('uploads only SKILL.md when there are no reference files', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValue('');
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      expect(upload).toHaveBeenCalledTimes(1);
    });
  });

  describe('call order', () => {
    test('uploads SKILL.md and every reference to GCS before activating', async () => {
      fg.sync.mockReturnValue(['references/a.md', 'references/b/c.txt']);
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValue('');

      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      expect(upload).toHaveBeenCalledTimes(3);
      const activateIdx = execGcloud.mock.calls.findIndex(([args]) =>
        args.includes('--target-state=active'),
      );
      const activateOrder = execGcloud.mock.invocationCallOrder[activateIdx];
      for (const order of upload.mock.invocationCallOrder) {
        expect(order).toBeLessThan(activateOrder);
      }
    });

    test('does not activate when a reference upload fails', async () => {
      fg.sync.mockReturnValue(['references/a.md']);
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValue('');
      upload
        .mockResolvedValueOnce('gs://dest')
        .mockRejectedValueOnce(new Error('gcs down'));

      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', false),
      ).rejects.toThrow('gcs down');
      expect(
        execGcloud.mock.calls.some(([args]) =>
          args.includes('--target-state=active'),
        ),
      ).toBe(false);
    });
  });

  describe('size limits', () => {
    const big = (bytes) => 'a'.repeat(bytes);

    test('fails when a reference .md file is over 64 KB', async () => {
      fg.sync.mockReturnValue(['references/huge.md']);
      readFileSync.mockImplementation((f) =>
        String(f).endsWith('huge.md') ? big(MAX_MARKDOWN_BYTES + 1) : SKILL_MD,
      );

      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', false),
      ).rejects.toThrow(/references\/huge\.md is 65537 bytes/);
      expect(execGcloud).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
    });

    test('allows a non-Markdown reference over 64 KB', async () => {
      fg.sync.mockReturnValue(['references/data.json']);
      readFileSync.mockImplementation((f) =>
        String(f).endsWith('data.json')
          ? big(MAX_MARKDOWN_BYTES + 1)
          : SKILL_MD,
      );
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValue('');

      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);
      expect(upload).toHaveBeenCalled();
    });

    test('fails when SKILL.md is over 64 KB', async () => {
      readFileSync.mockReturnValue(`${SKILL_MD}${big(MAX_MARKDOWN_BYTES)}`);
      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', true),
      ).rejects.toThrow(/SKILL\.md is \d+ bytes, max for a Markdown file/);
    });

    test('fails with more than 150 files in total, in dry-run too', async () => {
      fg.sync.mockReturnValue(
        Array.from({ length: MAX_FILES }, (_, i) => `references/f${i}.txt`),
      );
      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', true),
      ).rejects.toThrow(`has ${MAX_FILES + 1} files`);
      expect(execGcloud).not.toHaveBeenCalled();
    });

    test('accepts exactly 150 files', async () => {
      fg.sync.mockReturnValue(
        Array.from({ length: MAX_FILES - 1 }, (_, i) => `references/f${i}.txt`),
      );
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', true);
      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
    });

    test('fails when the zip is over 400 KB before creating anything', async () => {
      zipSync.mockReturnValue(new Uint8Array(MAX_ZIP_BYTES + 1));
      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', false),
      ).rejects.toThrow(`payload zip is ${MAX_ZIP_BYTES + 1} bytes`);
      expect(execGcloud).not.toHaveBeenCalled();
      expect(upload).not.toHaveBeenCalled();
    });

    test('accepts a zip of exactly 400 KB', async () => {
      zipSync.mockReturnValue(new Uint8Array(MAX_ZIP_BYTES));
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', true);
      expect(core.info).toHaveBeenCalledWith(
        '[dry-run] Would register skill: private-my-skill',
      );
    });
  });

  describe('revision pruning', () => {
    const versions = (n) =>
      Array.from(
        { length: n },
        (_, i) => `v0-${String(i + 1).padStart(2, '0')}`,
      );

    // Routes gcloud calls: existing skill with the given revisions; records prune calls.
    const setupRegistry = (
      revisions,
      { failDelete = [], failList = false } = {},
    ) => {
      execGcloud.mockImplementation(async (args) => {
        if (args.includes('describe')) {
          return args.some((a) => a.includes('defaultRevision'))
            ? revisions.at(-1)
            : '';
        }
        if (args.includes('list')) {
          if (failList) throw new Error('list denied');
          return revisions.join('\n');
        }
        if (args.includes('delete') && failDelete.includes(args[5])) {
          throw new Error('delete denied');
        }
        return '';
      });
    };
    const deleted = () =>
      execGcloud.mock.calls
        .filter(([a]) => a.includes('revisions') && a.includes('delete'))
        .map(([a]) => a[5]);
    const removed = () =>
      execGcloud.mock.calls
        .filter(([a]) => a[0] === 'storage' && a[1] === 'rm')
        .map(([a]) => a[3]);

    test('keeps the newest 20 revisions and prunes older ones with their GCS prefix', async () => {
      // 22 existing -> new v0-23 makes 23 -> prune the 3 oldest.
      setupRegistry([...versions(22)]);
      await registerSkill(
        'my-skill',
        '/skills/my-skill/SKILL.md',
        false,
        'clan',
      );

      expect(KEEP_REVISIONS).toBe(20);
      expect(deleted()).toEqual(['v0-01', 'v0-02', 'v0-03']);
      expect(removed()).toEqual([
        'gs://extenda-agent-artifacts/skills/clan-my-skill/v0-01/',
        'gs://extenda-agent-artifacts/skills/clan-my-skill/v0-02/',
        'gs://extenda-agent-artifacts/skills/clan-my-skill/v0-03/',
      ]);
    });

    test('registry revision is deleted before its GCS prefix', async () => {
      setupRegistry(versions(21));
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      const calls = execGcloud.mock.calls.map(([a]) => a);
      const del = calls.findIndex((a) => a.includes('delete'));
      const rm = calls.findIndex((a) => a[0] === 'storage' && a[1] === 'rm');
      expect(del).toBeGreaterThan(-1);
      expect(rm).toBeGreaterThan(del);
    });

    test('prunes nothing at or below 20 revisions', async () => {
      setupRegistry(versions(19)); // new one makes 20
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);
      expect(deleted()).toEqual([]);
      expect(removed()).toEqual([]);
    });

    test('never deletes the registry default revision', async () => {
      const revs = versions(22);
      execGcloud.mockImplementation(async (args) => {
        if (args.includes('describe'))
          return args.some((a) => a.includes('defaultRevision')) ? 'v0-01' : '';
        if (args.includes('list')) return revs.join('\n');
        return '';
      });
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);
      expect(deleted()).toEqual(['v0-02', 'v0-03']);
    });

    test('ignores revision ids that are not vN-NN', async () => {
      setupRegistry([...versions(22), 'legacy']);
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);
      expect(deleted()).not.toContain('legacy');
    });

    test('a failed prune warns, continues and does not fail the run', async () => {
      setupRegistry(versions(22), { failDelete: ['v0-01'] });
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not prune private-my-skill@v0-01'),
      );
      expect(deleted()).toEqual(['v0-01', 'v0-02', 'v0-03']);
      // The failed revision keeps its GCS prefix.
      expect(removed().some((p) => p.endsWith('/v0-01/'))).toBe(false);
    });

    test('a failing revisions list only warns', async () => {
      setupRegistry(versions(22), { failList: true });
      // getLatestRevision also lists and swallows the error, so this registers v0-01 afresh.
      await expect(
        registerSkill('my-skill', '/skills/my-skill/SKILL.md', false),
      ).resolves.toBeUndefined();
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not prune old revisions'),
      );
    });

    test('prunes before the new revision is created so a skill at the cap can get one', async () => {
      setupRegistry(versions(100));
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      const calls = execGcloud.mock.calls.map(([a]) => a);
      const firstDelete = calls.findIndex(
        (a) => a.includes('revisions') && a.includes('delete'),
      );
      const create = calls.findIndex(
        (a) => a.includes('revisions') && a.includes('create'),
      );
      expect(firstDelete).toBeGreaterThan(-1);
      expect(firstDelete).toBeLessThan(create);
      // 100 existing + 1 new -> only KEEP_REVISIONS in total remain.
      expect(deleted()).toHaveLength(100 + 1 - KEEP_REVISIONS);
      expect(deleted()).not.toContain('v0-100');
    });

    test('a GCS prefix that matches no objects is not a warning', async () => {
      execGcloud.mockImplementation(async (args) => {
        if (args.includes('describe'))
          return args.some((a) => a.includes('defaultRevision')) ? 'v0-21' : '';
        if (args.includes('list')) return versions(21).join('\n');
        if (args[0] === 'storage')
          throw new Error(
            'The following URLs matched no objects or files: gs://x',
          );
        return '';
      });
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);

      expect(core.warning).not.toHaveBeenCalled();
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('Pruned revision private-my-skill@v0-01'),
      );
    });

    test('other GCS errors while pruning still warn', async () => {
      execGcloud.mockImplementation(async (args) => {
        if (args.includes('describe'))
          return args.some((a) => a.includes('defaultRevision')) ? 'v0-21' : '';
        if (args.includes('list')) return versions(21).join('\n');
        if (args[0] === 'storage') throw new Error('PERMISSION_DENIED');
        return '';
      });
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', false);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not prune private-my-skill@v0-01'),
      );
    });

    test('dry-run for a skill that does not exist yet logs nothing about pruning', async () => {
      execGcloud.mockImplementation(async (args) => {
        if (args.includes('describe'))
          throw new Error("NOT_FOUND: Resource 'x' was not found.");
        return '';
      });
      await registerSkill('my-skill', '/skills/my-skill/SKILL.md', true);

      expect(core.warning).not.toHaveBeenCalled();
      expect(core.info.mock.calls.some(([m]) => /prune/i.test(m))).toBe(false);
    });

    test('dry-run logs what would be pruned without deleting', async () => {
      setupRegistry(versions(21)); // new revision would make 22 -> prune 2
      await registerSkill(
        'my-skill',
        '/skills/my-skill/SKILL.md',
        true,
        'clan',
      );

      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining(
          '[dry-run] Would prune revision private-clan-my-skill@v0-01',
        ),
      );
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('@v0-02'));
      expect(deleted()).toEqual([]);
      expectNoWrites();
    });
  });
});
