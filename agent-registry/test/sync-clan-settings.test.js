import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock('node:os', () => ({ default: { tmpdir: vi.fn(() => '/tmp') }, tmpdir: vi.fn(() => '/tmp') }));
vi.mock('fast-glob', () => ({ default: { sync: vi.fn(() => []) } }));
vi.mock('../../setup-gcloud/src/exec-gcloud.js');
vi.mock('../src/upload-gcs.js');

import * as core from '@actions/core';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from '../src/upload-gcs.js';

import { buildSettingsJson, syncClanSettings } from '../src/sync-clan-settings.js';

// ── buildSettingsJson ────────────────────────────────────────────────────────

describe('buildSettingsJson', () => {
  const baseline = {
    permissions: { allow: ['Bash(git status*)', 'Bash(ls)'] },
    commands: ['commands/init.md'],
    hooks: {
      PreToolUse: [
        { matcher: 'Bash', script: 'hooks/tool-guardian.sh' },
        { matcher: 'Write|Edit', script: 'hooks/secret-scanner.sh' },
      ],
    },
  };

  test('unions permissions from baseline and clan config', () => {
    const clan = { permissions: { allow: ['Bash(./gradlew *)'] } };
    const result = buildSettingsJson(baseline, clan, 'retail');
    expect(result.permissions.allow).toContain('Bash(git status*)');
    expect(result.permissions.allow).toContain('Bash(./gradlew *)');
  });

  test('deduplicates permissions', () => {
    const clan = { permissions: { allow: ['Bash(ls)'] } };
    const result = buildSettingsJson(baseline, clan, 'retail');
    expect(result.permissions.allow.filter((p) => p === 'Bash(ls)')).toHaveLength(1);
  });

  const sessionHooks = (result) => result.hooks.SessionStart[0].hooks;
  const sessionCommands = (result) => sessionHooks(result).map((h) => h.command);

  test('SessionStart is a single entry with a hooks array', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    expect(result.hooks.SessionStart).toHaveLength(1);
    expect(Array.isArray(result.hooks.SessionStart[0].hooks)).toBe(true);
  });

  test('SessionStart hooks include setup, fetch, chmod, CLAUDE.md sync', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    expect(cmds.some((c) => c.includes('mkdir -p'))).toBe(true);
    expect(cmds.some((c) => c.includes('clans/retail/settings.json'))).toBe(true);
    expect(cmds.some((c) => c.includes('chmod +x'))).toBe(true);
    expect(cmds.some((c) => c.includes('orchestrator/instructions.md'))).toBe(true);
  });

  test('fetches clan settings with fallback to global', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    const settingsCmd = cmds.find((c) => c.includes('settings.json'));
    expect(settingsCmd).toContain('clans/retail/settings.json');
    expect(settingsCmd).toContain('claude-code/settings.json');
  });

  test('downloads global PreToolUse hook scripts', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    expect(cmds.some((c) => c.includes('hooks/tool-guardian.sh'))).toBe(true);
    expect(cmds.some((c) => c.includes('hooks/secret-scanner.sh'))).toBe(true);
  });

  test('downloads clan hook scripts under hooks/<clan>/', () => {
    const clan = { hooks: { SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const cmds = sessionCommands(buildSettingsJson(baseline, clan, 'platform'));
    expect(cmds.some((c) => c.includes('hooks/platform/ensure-pre-commit.sh'))).toBe(true);
  });

  test('chmod uses wildcard, not explicit list', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    const chmodCmd = cmds.find((c) => c.startsWith('chmod'));
    expect(chmodCmd).toContain('*.sh');
  });

  test('runs clan SessionStart scripts after download', () => {
    const clan = { hooks: { SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const cmds = sessionCommands(buildSettingsJson(baseline, clan, 'platform'));
    const runCmd = cmds.find((c) => c.includes('[ -x') && c.includes('ensure-pre-commit.sh'));
    expect(runCmd).toBeDefined();
    // Run cmd should come after the download cmd
    const downloadIdx = cmds.findIndex((c) => c.includes('hooks/platform/ensure-pre-commit.sh'));
    const runIdx = cmds.indexOf(runCmd);
    expect(runIdx).toBeGreaterThan(downloadIdx);
  });

  test('downloads global commands', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    expect(cmds.some((c) => c.includes('commands/init.md'))).toBe(true);
  });

  test('downloads clan commands under commands/<clan>/', () => {
    const clan = { commands: ['commands/review-pr.md'] };
    const cmds = sessionCommands(buildSettingsJson(baseline, clan, 'retail'));
    expect(cmds.some((c) => c.includes('commands/retail/review-pr.md'))).toBe(true);
  });

  test('PreToolUse hooks use [ -x ] guard pattern', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    expect(result.hooks.PreToolUse[0].hooks[0].command).toMatch(/\[ -x .* \] && .* \|\| exit 0/);
  });

  test('PreToolUse entries include matcher field', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    expect(result.hooks.PreToolUse[0].matcher).toBe('Bash');
    expect(result.hooks.PreToolUse[1].matcher).toBe('Write|Edit');
  });

  test('clan PreToolUse hooks appended after global', () => {
    const clan = { hooks: { PreToolUse: [{ matcher: 'Bash', script: 'hooks/clan-lint.sh' }] } };
    const result = buildSettingsJson(baseline, clan, 'retail');
    expect(result.hooks.PreToolUse).toHaveLength(3);
    expect(result.hooks.PreToolUse[2].hooks[0].command).toContain('clan-lint.sh');
  });

  test('handles empty clan config gracefully', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    expect(result.permissions.allow).toEqual(baseline.permissions.allow);
  });

  test('handles null baseline gracefully', () => {
    const clan = { permissions: { allow: ['Bash(./gradlew *)'] }, commands: [] };
    const result = buildSettingsJson(null, clan, 'retail');
    expect(result.permissions.allow).toEqual(['Bash(./gradlew *)']);
    expect(result.hooks.SessionStart).toHaveLength(1);
  });
});

// ── syncClanSettings ─────────────────────────────────────────────────────────

const GLOBAL_YAML = `
permissions:
  allow:
    - "Bash(git status*)"
hooks:
  SessionStart:
    - script: hooks/session-init.sh
  PreToolUse:
    - matcher: "Bash"
      script: hooks/tool-guardian.sh
`;

const CLAN_YAML = `
clan: retail
permissions:
  allow:
    - "Bash(./gradlew *)"
hooks:
  PreToolUse:
    - matcher: "Bash"
      script: hooks/retail-lint.sh
commands: []
`;

describe('syncClanSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    existsSync.mockReturnValue(false);
    upload.mockResolvedValue('gs://extenda-agent-artifacts/test');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('does nothing when neither global nor clan yaml exists', async () => {
    existsSync.mockReturnValue(false);
    await syncClanSettings('/root/agent-registry', [], false, 'retail');
    expect(upload).not.toHaveBeenCalled();
  });

  describe('platform repo — hasGlobal=true', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('global/settings.yaml') || p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('global/settings.yaml')) return GLOBAL_YAML;
        if (p.includes('config/settings.yaml')) return CLAN_YAML;
        return '';
      });
    });

    test('uploads global settings.yaml to claude-code/settings.yaml', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('claude-code/settings.yaml');
    });

    test('uploads merged settings.json to clans/<clan>/', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'clans/retail/settings.json')).toBe(true);
    });

    test('stores raw clan yaml at clans/<clan>/settings.yaml', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('clans/retail/settings.yaml');
    });

    test('cleans up temp files after upload', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      expect(unlinkSync).toHaveBeenCalled();
    });
  });

  describe('clan repo — hasGlobal=false', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockReturnValue(CLAN_YAML);
      execGcloud.mockResolvedValue(''); // global baseline fetch (cp to tmp)
      // second readFileSync call in fetchGlobalBaseline reads the tmp file
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
    });

    test('fetches global baseline from GCS', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      expect(execGcloud).toHaveBeenCalledWith(
        expect.arrayContaining(['storage', 'cp', 'gs://extenda-agent-artifacts/claude-code/settings.yaml']),
        'gcloud',
        true,
      );
    });

    test('uploads merged settings.json for clan', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'clans/retail/settings.json')).toBe(true);
    });

    test('uses empty baseline when GCS fetch fails', async () => {
      execGcloud.mockRejectedValue(new Error('not found'));
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Could not fetch global baseline'));
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'clans/retail/settings.json')).toBe(true);
    });
  });

  describe('changed-path filtering', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('global/settings.yaml') || p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('global/settings.yaml')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
    });

    test('skips global upload when global/ is not in changed paths', async () => {
      await syncClanSettings('/root/agent-registry', ['agent-registry/config/settings.yaml'], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).not.toContain('claude-code/settings.yaml');
    });

    test('skips clan upload when config/ is not in changed paths', async () => {
      await syncClanSettings('/root/agent-registry', ['agent-registry/global/settings.yaml'], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.every((p) => !p.startsWith('clans/'))).toBe(true);
    });

    test('processes all when changed paths is empty', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('claude-code/settings.yaml');
      expect(calls.some((p) => p.startsWith('clans/'))).toBe(true);
    });
  });

  describe('dry-run', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockReturnValue(CLAN_YAML);
      execGcloud.mockResolvedValue('');
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
    });

    test('does not call upload in dry-run mode', async () => {
      await syncClanSettings('/root/agent-registry', [], true, 'retail');
      expect(upload).not.toHaveBeenCalled();
    });

    test('logs dry-run message', async () => {
      await syncClanSettings('/root/agent-registry', [], true, 'retail');
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('[dry-run]'));
    });
  });

  describe('validation', () => {
    test('throws when clan field is missing and clan param is falsy', async () => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return 'permissions:\n  allow: []\n';
      });
      execGcloud.mockResolvedValue('');
      await expect(syncClanSettings('/root/agent-registry', [], false, '')).rejects.toThrow(
        'config/settings.yaml is not valid',
      );
    });
  });
});
