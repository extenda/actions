import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('@actions/core');
vi.mock('fast-glob');
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => 'yaml: content'),
  existsSync: vi.fn(() => true),
}));
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');
vi.mock('../src/upload-gcs.js');
vi.mock('../src/register-agent.js');
vi.mock('../src/register-mcp.js');
vi.mock('../src/register-skill.js');
vi.mock('../src/delete-skills.js');
vi.mock('../src/sync-clan-settings.js');

import * as core from '@actions/core';
import { execSync } from 'child_process';
import fg from 'fast-glob';
import { existsSync } from 'fs';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { deleteSkills } from '../src/delete-skills.js';
import action from '../src/index.js';
import {
  getChangedPaths,
  getDeletedPaths,
  getDeletedSkillIds,
  isAffected,
} from '../src/index.js';
import { registerAgent } from '../src/register-agent.js';
import { registerMcp } from '../src/register-mcp.js';
import { registerSkill } from '../src/register-skill.js';
import { syncClanSettings } from '../src/sync-clan-settings.js';
import { upload } from '../src/upload-gcs.js';

beforeEach(() => {
  delete process.env.GITHUB_BASE_REF;
  core.getInput.mockImplementation((name) => {
    if (name === 'service-account-key') return 'fake-key';
    if (name === 'dry-run') return 'false';
    return '';
  });
  execSync.mockReturnValue('abc123\n'); // default: git rev-parse HEAD
  fg.sync.mockReturnValue([]);
  setupGcloud.mockResolvedValue('my-clan-prod');
  execGcloud.mockResolvedValue('');
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('getDeletedPaths', () => {
  afterEach(() => {
    delete process.env.GITHUB_BASE_SHA;
  });

  test('diffs deletions only, without rename detection, against HEAD~1 by default', () => {
    execSync.mockReturnValue('agent-registry/skills/old/SKILL.md\n');
    expect(getDeletedPaths()).toEqual(['agent-registry/skills/old/SKILL.md']);
    expect(execSync).toHaveBeenCalledWith(
      'git diff --name-only --no-renames --diff-filter=D HEAD~1...HEAD',
    );
  });

  test('uses GITHUB_BASE_SHA as the base when set', () => {
    process.env.GITHUB_BASE_SHA = 'abc1234';
    execSync.mockReturnValue('');
    expect(getDeletedPaths()).toEqual([]);
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('abc1234...HEAD'),
    );
  });

  test('warns and returns [] when git fails', () => {
    execSync.mockImplementation(() => {
      throw new Error('fatal: bad revision');
    });
    expect(getDeletedPaths()).toEqual([]);
    expect(core.warning).toHaveBeenCalledWith(
      expect.stringContaining('fetch-depth: 2'),
    );
  });
});

describe('getChangedPaths', () => {
  test('uses HEAD~1 when GITHUB_BASE_REF is not set', () => {
    execSync.mockReturnValue('agent-registry/agents/my-agent/agent.yaml\n');
    const paths = getChangedPaths();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('HEAD~1...HEAD'),
    );
    expect(paths).toEqual(['agent-registry/agents/my-agent/agent.yaml']);
  });

  test('uses GITHUB_BASE_SHA when set', () => {
    process.env.GITHUB_BASE_SHA = 'abc1234';
    execSync.mockReturnValue('agent-registry/skills/my-skill/SKILL.md\n');
    getChangedPaths();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('abc1234...HEAD'),
    );
    delete process.env.GITHUB_BASE_SHA;
  });

  test('returns empty array when git fails', () => {
    execSync.mockImplementation(() => {
      throw new Error('not a git repo');
    });
    expect(getChangedPaths()).toEqual([]);
  });

  test('filters out blank lines', () => {
    execSync.mockReturnValue('\nagent-registry/agents/x/agent.yaml\n\n');
    expect(getChangedPaths()).toEqual(['agent-registry/agents/x/agent.yaml']);
  });
});

describe('isAffected', () => {
  test('returns true when changedPaths is empty (process everything)', () => {
    expect(isAffected('agents/my-agent/', [])).toBe(true);
  });

  test('returns true when a changed path is under the given directory', () => {
    const changed = ['agent-registry/agents/my-agent/agent.yaml'];
    expect(isAffected('agents/my-agent/', changed)).toBe(true);
  });

  test('returns false when no changed path matches', () => {
    const changed = ['agent-registry/agents/other-agent/agent.yaml'];
    expect(isAffected('agents/my-agent/', changed)).toBe(false);
  });

  test('returns false when changed path is in a different section', () => {
    const changed = ['agent-registry/skills/my-skill/SKILL.md'];
    expect(isAffected('agents/my-agent/', changed)).toBe(false);
  });

  test('returns true for skill when skill file changed', () => {
    const changed = ['agent-registry/skills/fix-dependabot-pr/SKILL.md'];
    expect(isAffected('skills/fix-dependabot-pr/', changed)).toBe(true);
  });

  test('returns true for skill when only a nested reference file changed', () => {
    const changed = [
      'agent-registry/skills/java-api-clients/references/templates/src/A.java',
    ];
    expect(isAffected('skills/java-api-clients/', changed)).toBe(true);
  });
});

describe('action — change filtering', () => {
  const setupDiff = (changedFiles) => {
    // First execSync call is git rev-parse HEAD, second is git diff
    execSync
      .mockReturnValueOnce('abc123\n')
      .mockReturnValueOnce(changedFiles.join('\n') + '\n');
  };

  test('registers only the agent whose directory changed', async () => {
    setupDiff(['agent-registry/agents/platform-agent/agent.yaml']);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return [
          'agents/platform-agent/agent.yaml',
          'agents/other-agent/agent.yaml',
        ];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledTimes(1);
    expect(registerAgent).toHaveBeenCalledWith(
      'platform-agent',
      expect.any(String),
      false,
    );
  });

  test('registers only the skill whose directory changed', async () => {
    setupDiff(['agent-registry/skills/fix-dependabot-pr/SKILL.md']);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'skills/*/SKILL.md')
        return [
          'skills/fix-dependabot-pr/SKILL.md',
          'skills/other-skill/SKILL.md',
        ];
      return [];
    });

    await action();

    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(
      'fix-dependabot-pr',
      expect.any(String),
      false,
      'my-clan',
    );
  });

  // git calls in order: rev-parse HEAD, diff (changed), diff (deleted)
  const setupDiffs = (changed, deleted) => {
    execSync
      .mockReturnValueOnce('abc123\n')
      .mockReturnValueOnce(changed.join('\n') + '\n')
      .mockReturnValueOnce(deleted.join('\n') + '\n');
  };

  test('deletes a skill whose SKILL.md was removed in a deleted-only diff', async () => {
    existsSync.mockReturnValue(false);
    setupDiffs(
      ['agent-registry/skills/old-skill/SKILL.md'],
      ['agent-registry/skills/old-skill/SKILL.md'],
    );

    await action();

    expect(registerSkill).not.toHaveBeenCalled();
    expect(deleteSkills).toHaveBeenCalledWith(['old-skill'], false, 'my-clan');
  });

  test('does not delete a modified skill', async () => {
    setupDiffs(['agent-registry/skills/kept/SKILL.md'], []);
    fg.sync.mockImplementation((p) =>
      p === 'skills/*/SKILL.md' ? ['skills/kept/SKILL.md'] : [],
    );

    await action();

    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(deleteSkills).not.toHaveBeenCalled();
  });

  test('treats a renamed skill as delete of the old id and register of the new id', async () => {
    existsSync.mockImplementation((p) => !p.includes('/skills/old-name/'));
    setupDiffs(
      ['agent-registry/skills/new-name/SKILL.md'],
      ['agent-registry/skills/old-name/SKILL.md'],
    );
    fg.sync.mockImplementation((p) =>
      p === 'skills/*/SKILL.md' ? ['skills/new-name/SKILL.md'] : [],
    );

    await action();

    expect(registerSkill).toHaveBeenCalledWith(
      'new-name',
      expect.any(String),
      false,
      'my-clan',
    );
    expect(deleteSkills).toHaveBeenCalledWith(['old-name'], false, 'my-clan');
  });

  test('passes dry-run through to skill deletion', async () => {
    core.getInput.mockImplementation((n) =>
      n === 'dry-run' ? 'true' : 'fake-key',
    );
    existsSync.mockReturnValue(false);
    setupDiffs(
      ['agent-registry/skills/old-skill/SKILL.md'],
      ['agent-registry/skills/old-skill/SKILL.md'],
    );

    await action();

    expect(deleteSkills).toHaveBeenCalledWith(['old-skill'], true, 'my-clan');
  });

  test('does not call deleteSkills when the diff has no deletions', async () => {
    setupDiffs(['README.md'], []);

    await action();

    expect(deleteSkills).not.toHaveBeenCalled();
  });

  test('registers all items when no changed paths detected (git failure)', async () => {
    execSync.mockReturnValueOnce('abc123\n').mockImplementationOnce(() => {
      throw new Error('git error');
    });
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/agent-a/agent.yaml', 'agents/agent-b/agent.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledTimes(2);
  });

  test('skips items prefixed with example-', async () => {
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/example-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).not.toHaveBeenCalled();
  });

  test('registers only the MCP whose directory changed', async () => {
    setupDiff(['agent-registry/mcp/my-mcp/mcp.yaml']);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'mcp/*/mcp.yaml')
        return ['mcp/my-mcp/mcp.yaml', 'mcp/other-mcp/mcp.yaml'];
      return [];
    });

    await action();

    expect(registerMcp).toHaveBeenCalledTimes(1);
    expect(registerMcp).toHaveBeenCalledWith(
      'my-mcp',
      expect.any(String),
      false,
    );
  });

  describe('a failing skill', () => {
    const twoSkills = () => {
      setupDiffs([], []);
      fg.sync.mockImplementation((p) =>
        p === 'skills/*/SKILL.md'
          ? ['skills/bad/SKILL.md', 'skills/good/SKILL.md']
          : [],
      );
      existsSync.mockReturnValue(true);
    };

    test('does not stop later skills, deletions or clan settings, and fails once at the end', async () => {
      twoSkills();
      registerSkill.mockRejectedValueOnce(
        new Error("Skill 'bad': payload zip is 999999 bytes, max is 409600"),
      );
      registerSkill.mockResolvedValueOnce();

      await action();

      expect(registerSkill).toHaveBeenCalledTimes(2);
      expect(syncClanSettings).toHaveBeenCalled();
      expect(core.endGroup).toHaveBeenCalledTimes(2);
      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('1 skill(s) failed: bad (Skill'),
      );
    });

    test('lists every failed skill in the single failure', async () => {
      twoSkills();
      registerSkill.mockRejectedValue(new Error('boom'));

      await action();

      expect(core.setFailed).toHaveBeenCalledTimes(1);
      expect(core.setFailed).toHaveBeenCalledWith(
        '2 skill(s) failed: bad (boom); good (boom)',
      );
    });

    test('surfaces limit errors the same way in dry-run', async () => {
      core.getInput.mockImplementation((name) =>
        name === 'service-account-key'
          ? 'fake-key'
          : name === 'dry-run'
            ? 'true'
            : '',
      );
      twoSkills();
      registerSkill.mockRejectedValueOnce(new Error('has 151 files'));

      await action();

      expect(registerSkill).toHaveBeenCalledTimes(2);
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('bad (has 151 files)'),
      );
    });

    test('reports the cause of an exhausted activation retry, not the gcloud wrapper line', async () => {
      twoSkills();
      registerSkill.mockRejectedValueOnce(
        new Error(
          "The process 'gcloud' failed with exit code 1\n\nERROR: (gcloud.alpha.agent-registry.skills.update) FAILED_PRECONDITION: cannot set default revision to a revision with pending scan results",
        ),
      );
      registerSkill.mockResolvedValueOnce();

      await action();

      expect(registerSkill).toHaveBeenCalledTimes(2);
      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining(
          'bad (ERROR: (gcloud.alpha.agent-registry.skills.update) FAILED_PRECONDITION',
        ),
      );
    });

    test('prefers the ERROR: line over gcloud warnings printed before it', async () => {
      twoSkills();
      registerSkill.mockRejectedValueOnce(
        new Error(
          [
            "The process 'gcloud' failed with exit code 1",
            '',
            '/opt/homebrew/Caskroom/gcloud-cli/570.0.0/google-cloud-sdk/lib/third_party/google/api_core/_python_version_support.py:266: FutureWarning: You are using a Python version (3.11.15) which Google will stop supporting',
            '  warnings.warn(message, FutureWarning)',
            'ERROR: (gcloud.alpha.agent-registry.skills.update) FAILED_PRECONDITION: pending scan results',
          ].join('\n'),
        ),
      );
      registerSkill.mockResolvedValueOnce();

      await action();

      expect(core.setFailed).toHaveBeenCalledWith(
        '1 skill(s) failed: bad (ERROR: (gcloud.alpha.agent-registry.skills.update) FAILED_PRECONDITION: pending scan results)',
      );
    });

    test('falls back to the first non-wrapper line when there is no ERROR: line', async () => {
      twoSkills();
      registerSkill.mockRejectedValueOnce(
        new Error(
          "The process 'gcloud' failed with exit code 1\n\nsomething broke",
        ),
      );
      registerSkill.mockResolvedValueOnce();

      await action();

      expect(core.setFailed).toHaveBeenCalledWith(
        '1 skill(s) failed: bad (something broke)',
      );
    });

    test('does not call setFailed when every skill succeeds', async () => {
      twoSkills();
      await action();
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  test('passes dry-run=true to all register functions', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'service-account-key') return 'fake-key';
      if (name === 'dry-run') return 'true';
      return '';
    });
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/my-agent/agent.yaml'];
      if (pattern === 'skills/*/SKILL.md') return ['skills/my-skill/SKILL.md'];
      if (pattern === 'mcp/*/mcp.yaml') return ['mcp/my-mcp/mcp.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledWith(
      'my-agent',
      expect.any(String),
      true,
    );
    expect(registerSkill).toHaveBeenCalledWith(
      'my-skill',
      expect.any(String),
      true,
      'my-clan',
    );
    expect(registerMcp).toHaveBeenCalledWith(
      'my-mcp',
      expect.any(String),
      true,
    );
  });

  test('dry-run logs instructions upload instead of calling upload', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'service-account-key') return 'fake-key';
      if (name === 'dry-run') return 'true';
      return '';
    });
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/my-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(upload).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run] Would upload instructions'),
    );
  });

  test('uploads instructions to both versioned and latest paths', async () => {
    setupDiff([]);
    upload.mockResolvedValue(undefined);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/my-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('instructions.md'),
      expect.stringMatching(/my-agent\/[a-f0-9]+\/instructions\.md/),
    );
    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('instructions.md'),
      'agents/my-agent/instructions.md',
    );
  });

  test('registers orchestrator and uploads its instructions', async () => {
    setupDiff(['agent-registry/agents/orchestrator/instructions.md']);
    upload.mockResolvedValue(undefined);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/orchestrator/agent.yaml'];
      return [];
    });
    const { readFileSync } = await import('fs');
    readFileSync.mockReturnValue(
      'name: orchestrator\nurl: https://platform-agent.retailsvc.com/orchestrator\n',
    );

    await action();

    expect(registerAgent).toHaveBeenCalledWith(
      'orchestrator',
      expect.any(String),
      false,
    );
    expect(upload).toHaveBeenCalledWith(
      expect.stringContaining('instructions.md'),
      'agents/orchestrator/instructions.md',
    );
  });

  test('silently skips missing instructions.md', async () => {
    setupDiff([]);
    existsSync.mockReturnValue(false);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml')
        return ['agents/my-agent/agent.yaml'];
      return [];
    });

    await expect(action()).resolves.toBeUndefined();
    expect(upload).not.toHaveBeenCalled();
    expect(registerAgent).toHaveBeenCalledTimes(1);
  });

  test('calls setupGcloud with service account key', async () => {
    setupDiff([]);
    await action();
    expect(setupGcloud).toHaveBeenCalledWith('fake-key');
  });
});

describe('getDeletedSkillIds', () => {
  const root = '/root/agent-registry';

  test('skips example- skills, non-SKILL.md files and skills that still exist', () => {
    existsSync.mockImplementation((p) => p.includes('/re-added/'));
    expect(
      getDeletedSkillIds(root, [
        'agent-registry/skills/gone/SKILL.md',
        'agent-registry/skills/gone/SKILL.md',
        'agent-registry/skills/example-demo/SKILL.md',
        'agent-registry/skills/gone/notes.md',
        'agent-registry/skills/re-added/SKILL.md',
        'agent-registry/agents/a/agent.yaml',
      ]),
    ).toEqual(['gone']);
  });
});
