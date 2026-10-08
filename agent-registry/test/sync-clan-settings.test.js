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
    expect(cmds.some((c) => c.includes('config/retail/settings.json'))).toBe(true);
    expect(cmds.some((c) => c.includes('chmod +x'))).toBe(true);
    expect(cmds.some((c) => c.includes('orchestrator/instructions.md'))).toBe(true);
  });

  test('fetches clan settings from config/<clan>/, no claude-code fallback', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    const settingsCmd = cmds.find((c) => c.includes('settings.json'));
    expect(settingsCmd).toContain('config/retail/settings.json');
    expect(settingsCmd).not.toContain('claude-code/settings.json');
  });

  test('global mode (clanName=null): derives $CLAN at runtime, falls back to config/settings.json', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, null));
    const settingsCmd = cmds.find((c) => c.includes('settings.json'));
    expect(settingsCmd).toContain('$CLAN');
    expect(settingsCmd).toContain('discovered.md');
    expect(settingsCmd).toContain('config/settings.json');
    expect(settingsCmd).not.toContain('claude-code/settings.json');
  });

  test('global mode: omits clan hook and command downloads', () => {
    const clan = {
      hooks: { SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] },
      commands: ['commands/review-pr.md'],
    };
    const cmds = sessionCommands(buildSettingsJson(baseline, clan, null));
    expect(cmds.every((c) => !c.includes('ensure-pre-commit.sh'))).toBe(true);
    expect(cmds.every((c) => !c.includes('review-pr.md'))).toBe(true);
  });

  test('downloads global PreToolUse hook scripts', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    expect(cmds.some((c) => c.includes('hooks/tool-guardian.sh'))).toBe(true);
    expect(cmds.some((c) => c.includes('hooks/secret-scanner.sh'))).toBe(true);
  });

  test('downloads global SessionStart hook scripts from hooks/', () => {
    const base = { ...baseline, hooks: { ...baseline.hooks, SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const cmds = sessionCommands(buildSettingsJson(base, {}, 'retail'));
    // Must download from global hooks/ path (no clan prefix)
    expect(cmds.some((c) => c.includes('gcloud storage cp') && c.match(/hooks\/ensure-pre-commit\.sh/) && !c.includes('retail/'))).toBe(true);
  });

  test('runs global SessionStart scripts before clan SessionStart scripts', () => {
    const base = { ...baseline, hooks: { ...baseline.hooks, SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const clan = { hooks: { SessionStart: [{ script: 'hooks/clan-setup.sh' }] } };
    const cmds = sessionCommands(buildSettingsJson(base, clan, 'retail'));
    const globalRunIdx = cmds.findIndex((c) => c.includes('[ -x') && c.includes('ensure-pre-commit.sh'));
    const clanRunIdx = cmds.findIndex((c) => c.includes('[ -x') && c.includes('clan-setup.sh'));
    expect(globalRunIdx).toBeGreaterThan(-1);
    expect(clanRunIdx).toBeGreaterThan(globalRunIdx);
  });

  test('runs global SessionStart scripts in global template mode (clanName=null)', () => {
    const base = { ...baseline, hooks: { ...baseline.hooks, SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const cmds = sessionCommands(buildSettingsJson(base, {}, null));
    expect(cmds.some((c) => c.includes('[ -x') && c.includes('ensure-pre-commit.sh'))).toBe(true);
  });

  test('downloads clan conventions to .agent/conventions.md', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, 'retail'));
    expect(cmds.some((c) => c.includes('config/retail/conventions.md') && c.includes('.agent/conventions.md'))).toBe(true);
  });

  test('does not download conventions in global template mode (clanName=null)', () => {
    const cmds = sessionCommands(buildSettingsJson(baseline, {}, null));
    expect(cmds.every((c) => !c.includes('conventions.md'))).toBe(true);
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

  test('PreToolUse hooks use [ -x ] guard pattern that propagates the exit code', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    const command = result.hooks.PreToolUse[0].hooks[0].command;
    expect(command).toBe(
      '[ -x "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.sh" ] || exit 0;' +
        ' "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.sh"',
    );
    expect(command).not.toMatch(/\|\| exit 0$/);
  });

  test('hooks without args or timeout emit neither field', () => {
    const hook = buildSettingsJson(baseline, {}, 'retail').hooks.PreToolUse[0].hooks[0];
    expect(hook).toEqual({ type: 'command', command: expect.any(String) });
  });

  test('omits Stop when no Stop hooks are defined', () => {
    expect(buildSettingsJson(baseline, {}, 'retail').hooks.Stop).toBeUndefined();
  });

  describe('Stop, args and timeout', () => {
    const withStop = {
      ...baseline,
      hooks: {
        SessionStart: [{ script: 'hooks/verify-on-stop.sh', args: ['--baseline'] }],
        PreToolUse: [
          { matcher: 'Write|Edit|MultiEdit|NotebookEdit|Bash', script: 'hooks/test-guard.sh' },
        ],
        Stop: [{ script: 'hooks/verify-on-stop.sh', timeout: 900 }],
      },
    };

    test('emits Stop entries with timeout and no matcher', () => {
      const result = buildSettingsJson(withStop, {}, 'retail');
      expect(result.hooks.Stop).toEqual([
        {
          hooks: [
            {
              type: 'command',
              command:
                '[ -x "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh" ] || exit 0;' +
                ' "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh"',
              timeout: 900,
            },
          ],
        },
      ]);
    });

    test('accepts a compound matcher for PreToolUse', () => {
      const result = buildSettingsJson(withStop, {}, 'retail');
      expect(result.hooks.PreToolUse[0].matcher).toBe('Write|Edit|MultiEdit|NotebookEdit|Bash');
    });

    test('passes args to SessionStart scripts and downloads a shared script once', () => {
      const cmds = sessionCommands(buildSettingsJson(withStop, {}, 'retail'));
      expect(cmds.filter((c) => c.includes('gcloud storage cp') && c.includes('hooks/verify-on-stop.sh'))).toHaveLength(1);
      expect(cmds).toContain(
        '[ -x "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh" ] && "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh" --baseline || true',
      );
    });

    test('shell-quotes arguments with unsafe characters', () => {
      const cfg = { hooks: { Stop: [{ script: 'hooks/x.sh', args: ['a b', "it's", '$(rm -rf /)', 'plain-1.2'] }] } };
      const command = buildSettingsJson(cfg, {}, 'retail').hooks.Stop[0].hooks[0].command;
      expect(command).toContain(`x.sh" 'a b' 'it'\\''s' '$(rm -rf /)' plain-1.2`);
    });

    test('clan Stop hooks append after global and are downloaded', () => {
      const clan = { hooks: { Stop: [{ script: 'hooks/clan-stop.sh' }] } };
      const result = buildSettingsJson(withStop, clan, 'retail');
      expect(result.hooks.Stop).toHaveLength(2);
      expect(result.hooks.Stop[1].hooks[0].command).toContain('clan-stop.sh');
      expect(sessionCommands(result).some((c) => c.includes('hooks/retail/clan-stop.sh'))).toBe(true);
    });
  });

  test('clan hook with same filename as global SessionStart hook is not downloaded or run again', () => {
    const base = { ...baseline, hooks: { ...baseline.hooks, SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }] } };
    const clan = {
      hooks: {
        SessionStart: [{ script: 'hooks/ensure-pre-commit.sh' }], // same filename as global
        PreToolUse: [{ matcher: 'Bash', script: 'hooks/clan-lint.sh' }],
      },
    };
    const cmds = sessionCommands(buildSettingsJson(base, clan, 'retail'));
    // ensure-pre-commit.sh must be downloaded exactly once (from global hooks/, not retail/)
    const downloads = cmds.filter((c) => c.includes('gcloud storage cp') && c.includes('ensure-pre-commit.sh'));
    expect(downloads).toHaveLength(1);
    expect(downloads[0]).not.toContain('retail/');
    // And run exactly once (global SessionStart, clan entry skipped)
    const runs = cmds.filter((c) => c.includes('[ -x') && c.includes('ensure-pre-commit.sh'));
    expect(runs).toHaveLength(1);
  });

  test('clan command with same filename as global command is not downloaded', () => {
    const clan = { commands: ['commands/init.md'] }; // same filename as global
    const cmds = sessionCommands(buildSettingsJson(baseline, clan, 'retail'));
    const initDownloads = cmds.filter((c) => c.includes('init.md'));
    expect(initDownloads).toHaveLength(1);
    expect(initDownloads[0]).not.toContain('retail/');
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
    - script: hooks/ensure-pre-commit.sh
  PreToolUse:
    - matcher: "Bash"
      script: hooks/tool-guardian.sh
`;

const CLAN_YAML = `
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
    execGcloud.mockResolvedValue('');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('does nothing when neither global nor clan yaml exists and no clan param', async () => {
    existsSync.mockReturnValue(false);
    await syncClanSettings('/root/agent-registry', [], false, '');
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
      // No existing clans in GCS by default
      execGcloud.mockResolvedValue('');
    });

    test('uploads global settings.yaml to config/settings.yaml', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/settings.yaml');
    });

    test('uploads global settings.json to config/settings.json', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/settings.json');
    });

    test('uploads merged settings.json to config/<clan>/', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'config/platform/settings.json')).toBe(true);
    });

    test('uploads conventions.md to config/<clan>/conventions.md when it exists', async () => {
      existsSync.mockImplementation((p) =>
        p.includes('global/settings.yaml') || p.includes('config/settings.yaml') || p.includes('conventions.md'),
      );
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/platform/conventions.md');
    });

    test('skips conventions upload when conventions.md does not exist', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.every((p) => !p.includes('conventions.md'))).toBe(true);
    });

    test('stores raw clan yaml at config/<clan>/settings.yaml', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/platform/settings.yaml');
    });

    test('rebuilds clan settings.json for all clans listed in GCS', async () => {
      execGcloud.mockImplementation((args) => {
        if (args.includes('ls')) {
          return Promise.resolve(
            'gs://extenda-agent-artifacts/config/alpha/\n' +
            'gs://extenda-agent-artifacts/config/beta/\n',
          );
        }
        // cp for clan yaml fetch — succeed silently
        return Promise.resolve('');
      });
      readFileSync.mockImplementation((p) => {
        if (p.includes('global/settings.yaml')) return GLOBAL_YAML;
        // clan yaml fetched from GCS tmp file or local config/settings.yaml
        return CLAN_YAML;
      });

      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/alpha/settings.json');
      expect(calls).toContain('config/beta/settings.json');
    });

    test('skips clan rebuild when GCS listing fails', async () => {
      execGcloud.mockRejectedValue(new Error('permission denied'));
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Could not list GCS clans'));
    });

    test('deletes stale GCS hook when removed locally', async () => {
      execGcloud.mockImplementation((args) => {
        if (args[1] === 'ls' && args[2]?.includes('hooks/')) {
          return Promise.resolve('gs://extenda-agent-artifacts/hooks/stale-hook.sh\n');
        }
        return Promise.resolve('');
      });
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      expect(execGcloud).toHaveBeenCalledWith(
        expect.arrayContaining(['storage', 'rm', 'gs://extenda-agent-artifacts/hooks/stale-hook.sh']),
        'gcloud',
        true,
      );
    });

    test('dry-run logs deletion instead of deleting', async () => {
      execGcloud.mockImplementation((args) => {
        if (args[1] === 'ls' && args[2]?.includes('hooks/')) {
          return Promise.resolve('gs://extenda-agent-artifacts/hooks/stale-hook.sh\n');
        }
        return Promise.resolve('');
      });
      await syncClanSettings('/root/agent-registry', [], true, 'platform');
      expect(execGcloud).not.toHaveBeenCalledWith(expect.arrayContaining(['storage', 'rm']), expect.anything(), expect.anything());
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('[dry-run] Would delete'));
    });

    test('cleans up temp files after upload', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      expect(unlinkSync).toHaveBeenCalled();
    });
  });

  describe('clan repo — hasGlobal=false', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
      execGcloud.mockResolvedValue('');
    });

    test('fetches global baseline from GCS config/settings.yaml', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      expect(execGcloud).toHaveBeenCalledWith(
        expect.arrayContaining(['storage', 'cp', 'gs://extenda-agent-artifacts/config/settings.yaml']),
        'gcloud',
        true,
      );
    });

    test('uploads merged settings.json for clan', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'config/retail/settings.json')).toBe(true);
    });

    test('uses empty baseline when GCS fetch fails', async () => {
      execGcloud.mockRejectedValue(new Error('not found'));
      await syncClanSettings('/root/agent-registry', [], false, 'retail');
      expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('Could not fetch global baseline'));
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.some((p) => p === 'config/retail/settings.json')).toBe(true);
    });
  });

  describe('changed-path filtering', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('global/settings.yaml') || p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('global/settings.yaml')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
      execGcloud.mockResolvedValue('');
    });

    test('skips global upload when global/ is not in changed paths', async () => {
      await syncClanSettings('/root/agent-registry', ['agent-registry/config/settings.yaml'], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).not.toContain('config/settings.yaml');
      expect(calls).not.toContain('config/settings.json');
    });

    test('skips clan upload when config/ is not in changed paths', async () => {
      await syncClanSettings('/root/agent-registry', ['agent-registry/global/settings.yaml'], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.every((p) => !p.startsWith('config/platform/'))).toBe(true);
    });

    test('processes all when changed paths is empty', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/settings.yaml');
      expect(calls).toContain('config/settings.json');
      expect(calls.some((p) => p.startsWith('config/platform/'))).toBe(true);
    });
  });

  describe('dry-run', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return CLAN_YAML;
      });
      execGcloud.mockResolvedValue('');
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
    test('throws when clan param is falsy', async () => {
      existsSync.mockImplementation((p) => p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return 'permissions:\n  allow: []\n';
      });
      execGcloud.mockResolvedValue('');
      await expect(syncClanSettings('/root/agent-registry', [], false, '')).rejects.toThrow(
        'Clan name could not be determined',
      );
    });
  });

  describe('no config/settings.yaml — global-only merge', () => {
    beforeEach(() => {
      existsSync.mockReturnValue(false);
      execGcloud.mockResolvedValue('');
    });

    test('uploads merged settings.json using global baseline when no clan yaml exists', async () => {
      // readFileSync is called after execGcloud cp to read the temp file
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return '';
      });

      await syncClanSettings('/root/agent-registry', [], false, 'cardpayment');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/cardpayment/settings.json');
    });

    test('uploads empty settings.yaml when no clan yaml exists (so global-change rebuild finds the clan)', async () => {
      readFileSync.mockImplementation((p) => {
        if (p.includes('/tmp/')) return GLOBAL_YAML;
        return '';
      });

      await syncClanSettings('/root/agent-registry', [], false, 'cardpayment');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/cardpayment/settings.yaml');
    });

    test('does nothing when no yaml and no clan param', async () => {
      await syncClanSettings('/root/agent-registry', [], false, '');
      expect(upload).not.toHaveBeenCalled();
    });
  });
});
