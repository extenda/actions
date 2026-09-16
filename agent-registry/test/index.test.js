import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('child_process', () => ({ execSync: vi.fn() }));
vi.mock('@actions/core');
vi.mock('fast-glob');
vi.mock('fs', () => ({ readFileSync: vi.fn(() => 'yaml: content'), existsSync: vi.fn(() => true) }));
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');
vi.mock('../src/upload-gcs.js');
vi.mock('../src/register-agent.js');
vi.mock('../src/register-mcp.js');
vi.mock('../src/register-skill.js');

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import * as core from '@actions/core';
import fg from 'fast-glob';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from '../src/upload-gcs.js';
import { registerAgent } from '../src/register-agent.js';
import { registerMcp } from '../src/register-mcp.js';
import { registerSkill } from '../src/register-skill.js';

import { getChangedPaths, isAffected } from '../src/index.js';
import action from '../src/index.js';

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
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('HEAD~1...HEAD'));
    expect(paths).toEqual(['agent-registry/agents/my-agent/agent.yaml']);
  });

  test('uses origin/{base} when GITHUB_BASE_REF is set', () => {
    process.env.GITHUB_BASE_REF = 'main';
    execSync.mockReturnValue('agent-registry/skills/my-skill/SKILL.md\n');
    getChangedPaths();
    expect(execSync).toHaveBeenCalledWith(expect.stringContaining('origin/main...HEAD'));
  });

  test('returns empty array when git fails', () => {
    execSync.mockImplementation(() => { throw new Error('not a git repo'); });
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
      if (pattern === 'agents/*/agent.yaml') return ['agents/platform-agent/agent.yaml', 'agents/other-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledTimes(1);
    expect(registerAgent).toHaveBeenCalledWith('platform-agent', expect.any(String), false);
  });

  test('registers only the skill whose directory changed', async () => {
    setupDiff(['agent-registry/skills/fix-dependabot-pr/SKILL.md']);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'skills/*/SKILL.md') return ['skills/fix-dependabot-pr/SKILL.md', 'skills/other-skill/SKILL.md'];
      return [];
    });

    await action();

    expect(registerSkill).toHaveBeenCalledTimes(1);
    expect(registerSkill).toHaveBeenCalledWith('fix-dependabot-pr', expect.any(String), false, 'my-clan');
  });

  test('registers all items when no changed paths detected (git failure)', async () => {
    execSync
      .mockReturnValueOnce('abc123\n')
      .mockImplementationOnce(() => { throw new Error('git error'); });
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/agent-a/agent.yaml', 'agents/agent-b/agent.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledTimes(2);
  });

  test('skips items prefixed with example-', async () => {
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/example-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).not.toHaveBeenCalled();
  });

  test('registers only the MCP whose directory changed', async () => {
    setupDiff(['agent-registry/mcp/my-mcp/mcp.yaml']);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'mcp/*/mcp.yaml') return ['mcp/my-mcp/mcp.yaml', 'mcp/other-mcp/mcp.yaml'];
      return [];
    });

    await action();

    expect(registerMcp).toHaveBeenCalledTimes(1);
    expect(registerMcp).toHaveBeenCalledWith('my-mcp', expect.any(String), false);
  });

  test('passes dry-run=true to all register functions', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'service-account-key') return 'fake-key';
      if (name === 'dry-run') return 'true';
      return '';
    });
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/my-agent/agent.yaml'];
      if (pattern === 'skills/*/SKILL.md') return ['skills/my-skill/SKILL.md'];
      if (pattern === 'mcp/*/mcp.yaml') return ['mcp/my-mcp/mcp.yaml'];
      return [];
    });

    await action();

    expect(registerAgent).toHaveBeenCalledWith('my-agent', expect.any(String), true);
    expect(registerSkill).toHaveBeenCalledWith('my-skill', expect.any(String), true, 'my-clan');
    expect(registerMcp).toHaveBeenCalledWith('my-mcp', expect.any(String), true);
  });

  test('dry-run logs instructions upload instead of calling upload', async () => {
    core.getInput.mockImplementation((name) => {
      if (name === 'service-account-key') return 'fake-key';
      if (name === 'dry-run') return 'true';
      return '';
    });
    setupDiff([]);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/my-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(upload).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('[dry-run] Would upload instructions'));
  });

  test('uploads instructions to both versioned and latest paths', async () => {
    setupDiff([]);
    upload.mockResolvedValue(undefined);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/my-agent/agent.yaml'];
      return [];
    });

    await action();

    expect(upload).toHaveBeenCalledWith(expect.stringContaining('instructions.md'), expect.stringMatching(/my-agent\/[a-f0-9]+\/instructions\.md/));
    expect(upload).toHaveBeenCalledWith(expect.stringContaining('instructions.md'), 'agents/my-agent/instructions.md');
  });

  test('registers orchestrator and uploads its instructions', async () => {
    setupDiff(['agent-registry/agents/orchestrator/instructions.md']);
    upload.mockResolvedValue(undefined);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/orchestrator/agent.yaml'];
      return [];
    });
    const { readFileSync } = await import('fs');
    readFileSync.mockReturnValue('name: orchestrator\nurl: https://platform-agent.retailsvc.com/orchestrator\n');

    await action();

    expect(registerAgent).toHaveBeenCalledWith('orchestrator', expect.any(String), false);
    expect(upload).toHaveBeenCalledWith(expect.stringContaining('instructions.md'), 'agents/orchestrator/instructions.md');
  });

  test('silently skips missing instructions.md', async () => {
    setupDiff([]);
    existsSync.mockReturnValue(false);
    fg.sync.mockImplementation((pattern) => {
      if (pattern === 'agents/*/agent.yaml') return ['agents/my-agent/agent.yaml'];
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
