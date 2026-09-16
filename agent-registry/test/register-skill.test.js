import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock('fflate', () => ({
  zipSync: vi.fn(() => new Uint8Array([1, 2, 3])),
  strToU8: vi.fn(() => new Uint8Array([1, 2, 3])),
}));
vi.mock('node:os', () => ({ default: { tmpdir: vi.fn(() => '/tmp') }, tmpdir: vi.fn(() => '/tmp') }));
vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import * as core from '@actions/core';
import { readFileSync, unlinkSync } from 'node:fs';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

import { parseSkillMeta, registerSkill } from '../src/register-skill.js';

const SKILL_MD = `---
name: Fix Dependabot PR
description: Automatically fixes failing Dependabot PRs
---

## Skill content
`;

const revisionsList = (...versions) => versions.join('\n');

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
    expect(parseSkillMeta('# No frontmatter')).toEqual({ name: '', description: '' });
  });

  test('handles description with colons', () => {
    const content = `---\nname: S\ndescription: Does A: and B\n---\n`;
    expect(parseSkillMeta(content).description).toBe('Does A: and B');
  });
});

describe('registerSkill', () => {
  beforeEach(() => {
    readFileSync.mockReturnValue(SKILL_MD);
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
      expect(createArgs).toContain('--description=Automatically fixes failing Dependabot PRs');
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
      execGcloud.mockResolvedValueOnce(''); // revisions create
      execGcloud.mockResolvedValueOnce(''); // activate

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(2)).toContain('v0-02');
    });

    test('picks the highest version when multiple revisions exist', async () => {
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v0-01', 'v0-03', 'v0-02'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(2)).toContain('v0-04');
    });

    test('uses skills revisions create (not skills create) for existing skill', async () => {
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v0-01'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      const revCreateArgs = call(2);
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
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(2)).toContain('v3-00');
    });

    test('bumps major on major/ branch', async () => {
      process.env.GITHUB_HEAD_REF = 'major/overhaul';
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v1-05'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(2)).toContain('v2-00');
    });

    test('does not bump major on branch that merely contains "major" mid-word', async () => {
      process.env.GITHUB_HEAD_REF = 'fix/fix-major-bug';
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce(revisionsList('v0-03'));
      execGcloud.mockResolvedValueOnce('');
      execGcloud.mockResolvedValueOnce('');

      await registerSkill('my-skill', '/SKILL.md', false);

      expect(call(2)).toContain('v0-04');
    });
  });

  describe('validation', () => {
    test('throws when frontmatter name is missing', async () => {
      readFileSync.mockReturnValue('---\ndescription: A description\n---\n');
      await expect(registerSkill('my-skill', '/SKILL.md', false))
        .rejects.toThrow("missing required frontmatter field: name");
    });

    test('throws when frontmatter description is missing', async () => {
      readFileSync.mockReturnValue('---\nname: My Skill\n---\n');
      await expect(registerSkill('my-skill', '/SKILL.md', false))
        .rejects.toThrow("missing required frontmatter field: description");
    });

    test('throws when skill body is empty', async () => {
      readFileSync.mockReturnValue('---\nname: My Skill\ndescription: A description\n---\n');
      await expect(registerSkill('my-skill', '/SKILL.md', false))
        .rejects.toThrow("must have instructions after the frontmatter");
    });

    test('throws on empty body even in dry-run', async () => {
      readFileSync.mockReturnValue('---\nname: My Skill\ndescription: A description\n---\n');
      await expect(registerSkill('my-skill', '/SKILL.md', true))
        .rejects.toThrow("must have instructions after the frontmatter");
    });
  });

  describe('dry-run', () => {
    test('prints create message for new skill', async () => {
      await registerSkill('my-skill', '/SKILL.md', true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would register skill: private-my-skill');
      expect(execGcloud).not.toHaveBeenCalled();
    });

    test('prints update message with next version for existing skill', async () => {
      await registerSkill('my-skill', '/SKILL.md', true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would register skill: private-my-skill');
      expect(execGcloud).not.toHaveBeenCalled();
    });
  });

  describe('temp file cleanup', () => {
    test('deletes zip file even when revisions create fails', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found')); // skillExists
      execGcloud.mockResolvedValueOnce(''); // skills create
      execGcloud.mockRejectedValueOnce(new Error('gcloud error')); // revisions create fails

      await expect(registerSkill('my-skill', '/SKILL.md', false)).rejects.toThrow('gcloud error');

      expect(unlinkSync).toHaveBeenCalledOnce();
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
});
