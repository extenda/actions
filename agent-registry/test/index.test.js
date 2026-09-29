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
vi.mock('../src/register-convention.js');

import * as core from '@actions/core';
import { execSync } from 'child_process';
import fg from 'fast-glob';
import { existsSync } from 'fs';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import action from '../src/index.js';
import { getChangedPaths, isAffected } from '../src/index.js';
import { registerAgent } from '../src/register-agent.js';
import {
  readConvention,
  registerConvention,
  uploadConventionIndex,
} from '../src/register-convention.js';
import { registerMcp } from '../src/register-mcp.js';
import { registerSkill } from '../src/register-skill.js';
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

describe('getChangedPaths', () => {
  test('uses HEAD~1 when GITHUB_BASE_REF is not set', () => {
    execSync.mockReturnValue('agent-registry/agents/my-agent/agent.yaml\n');
    const paths = getChangedPaths();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('HEAD~1...HEAD'),
    );
    expect(paths).toEqual(['agent-registry/agents/my-agent/agent.yaml']);
  });

  test('uses origin/{base} when GITHUB_BASE_REF is set', () => {
    process.env.GITHUB_BASE_REF = 'main';
    execSync.mockReturnValue('agent-registry/skills/my-skill/SKILL.md\n');
    getChangedPaths();
    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('origin/main...HEAD'),
    );
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
      if (pattern === 'skills/*')
        return ['skills/fix-dependabot-pr', 'skills/other-skill'];
      return [];
    });

    await action();

    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(
      'fix-dependabot-pr',
      expect.stringMatching(/agent-registry\/skills\/fix-dependabot-pr$/),
      false,
      'my-clan',
    );
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
      if (pattern === 'skills/*') return ['skills/my-skill'];
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

  test('discovers skills as directories and treats resource changes as affecting the skill', async () => {
    setupDiff(['agent-registry/skills/my-skill/references/api.md']);
    fg.sync.mockImplementation((pattern, opts) => {
      if (pattern === 'skills/*' && opts.onlyDirectories)
        return ['skills/my-skill', 'skills/example-skill'];
      return [];
    });

    await action();

    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith(
      'my-skill',
      expect.stringMatching(/agent-registry\/skills\/my-skill$/),
      false,
      'my-clan',
    );
  });

  describe('conventions', () => {
    const conventionDirs = (...dirs) =>
      fg.sync.mockImplementation((pattern, opts) => {
        if (pattern === 'conventions/*' && opts.onlyDirectories) return dirs;
        return [];
      });

    beforeEach(() => {
      readConvention.mockImplementation((id) => ({
        name: `${id} name`,
        description: `${id} desc`,
        files: ['CONVENTIONS.md'],
      }));
    });

    test('uploads only the changed convention but indexes all of them', async () => {
      setupDiff(['agent-registry/conventions/java/references/logging.md']);
      conventionDirs(
        'conventions/java',
        'conventions/api',
        'conventions/example-conv',
      );

      await action();

      expect(registerConvention).toHaveBeenCalledTimes(1);
      expect(registerConvention).toHaveBeenCalledWith(
        'java',
        expect.stringMatching(/agent-registry\/conventions\/java$/),
        'abc123',
        false,
        'my-clan',
      );
      expect(uploadConventionIndex).toHaveBeenCalledWith(
        'my-clan',
        [
          expect.objectContaining({ id: 'java', name: 'java name' }),
          expect.objectContaining({ id: 'api', name: 'api name' }),
        ],
        false,
      );
    });

    test('does not touch conventions when nothing under conventions/ changed', async () => {
      setupDiff(['agent-registry/skills/my-skill/SKILL.md']);
      conventionDirs('conventions/java');

      await action();

      expect(registerConvention).not.toHaveBeenCalled();
      expect(uploadConventionIndex).not.toHaveBeenCalled();
    });

    test('rebuilds the index when a convention is deleted', async () => {
      setupDiff(['agent-registry/conventions/old/CONVENTIONS.md']);
      conventionDirs('conventions/java');

      await action();

      expect(registerConvention).not.toHaveBeenCalled();
      expect(uploadConventionIndex).toHaveBeenCalledWith(
        'my-clan',
        [expect.objectContaining({ id: 'java' })],
        false,
      );
    });

    test('skips the index for a clan without conventions when no diff is available', async () => {
      setupDiff([]);
      conventionDirs();

      await action();

      expect(uploadConventionIndex).not.toHaveBeenCalled();
    });

    test('fails on an invalid convention even when it did not change', async () => {
      setupDiff(['agent-registry/conventions/java/CONVENTIONS.md']);
      conventionDirs('conventions/java', 'conventions/broken');
      readConvention.mockImplementation((id) => {
        if (id === 'broken')
          throw new Error(
            "Convention directory 'broken' is missing required file: CONVENTIONS.md",
          );
        return { name: 'n', description: 'd', files: ['CONVENTIONS.md'] };
      });

      await expect(action()).rejects.toThrow(
        "'broken' is missing required file",
      );
      expect(uploadConventionIndex).not.toHaveBeenCalled();
    });

    test('passes dry-run through', async () => {
      core.getInput.mockImplementation((name) => {
        if (name === 'service-account-key') return 'fake-key';
        if (name === 'dry-run') return 'true';
        return '';
      });
      setupDiff([]);
      conventionDirs('conventions/java');

      await action();

      expect(registerConvention).toHaveBeenCalledWith(
        'java',
        expect.any(String),
        'abc123',
        true,
        'my-clan',
      );
      expect(uploadConventionIndex).toHaveBeenCalledWith(
        'my-clan',
        expect.any(Array),
        true,
      );
    });
  });

  test('calls setupGcloud with service account key', async () => {
    setupDiff([]);
    await action();
    expect(setupGcloud).toHaveBeenCalledWith('fake-key');
  });
});
