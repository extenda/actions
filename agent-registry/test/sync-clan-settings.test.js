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

import { validate } from 'jsonschema';
import globalSchema from '../src/global-settings.schema.json';
import clanSchema from '../src/clan-settings.schema.json';
import { buildSettingsJson, checkMainAgent, syncClanSettings } from '../src/sync-clan-settings.js';

// ── buildSettingsJson ────────────────────────────────────────────────────────

describe('buildSettingsJson', () => {
  const baseline = {
    bootstrap: 'hooks/session-start.mjs',
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
  // The steps of the one SessionStart hook, in the order they run.
  const sessionCommands = (result) => sessionHooks(result).flatMap((h) => h.command.split('\n'));

  test('SessionStart runs on startup, clear and fork, not on resume or compact', () => {
    const matcher = (clanName) =>
      buildSettingsJson(baseline, {}, clanName).hooks.SessionStart[0].matcher;
    expect(matcher('retail')).toBe('startup|clear|fork');
    expect(matcher(null)).toBe('startup|clear|fork');
    const re = new RegExp(`^(?:${matcher('retail')})$`);
    const matching = (sources) => sources.filter((s) => re.test(s));
    expect(matching(['startup', 'resume', 'clear', 'compact', 'fork'])).toEqual(['startup', 'clear', 'fork']);
  });

  describe('bootstrap', () => {
    const boot = {
      ...baseline,
      bootstrap: 'hooks/session-start.sh',
      hooks: {
        ...baseline.hooks,
        SessionStart: [
          { script: 'hooks/ensure-pre-commit.sh' },
          {
            script: 'hooks/verify-on-stop.sh',
            args: ['--baseline'],
            timeout: 30,
          },
        ],
      },
    };
    const command = (result) => sessionHooks(result)[0].command;

    test('runs the bootstrap script with the clan and the SessionStart scripts', () => {
      const result = buildSettingsJson(boot, {}, 'retail');
      expect(result.hooks.SessionStart).toEqual([
        { matcher: 'startup|clear|fork', hooks: [expect.any(Object)] },
      ]);
      expect(command(result)).toContain(
        `bash "$s" --clan retail --run ensure-pre-commit.sh --run 'verify-on-stop.sh --baseline'`,
      );
      expect(command(result)).toContain('if bash -n "$s" 2>/dev/null; then bash "$s" --clan retail');
      expect(command(result)).toContain('could not be downloaded. Run gcloud auth login, then start a new session.');
      expect(sessionHooks(result)[0].timeout).toBe(90);
    });

    test('downloads only the bootstrap script, and only when it is missing', () => {
      const cmd = command(buildSettingsJson(boot, {}, 'retail'));
      expect(cmd).toContain(
        '[ -f "$s" ] || CLOUDSDK_CORE_DISABLE_PROMPTS=1 gcloud storage cp gs://extenda-agent-artifacts/hooks/session-start.sh "$s"',
      );
      expect(cmd.match(/gcloud storage/g)).toHaveLength(1);
      expect(cmd).not.toContain('orchestrator/instructions.md');
    });

    test('a .mjs bootstrap is checked and run with node', () => {
      const mjs = { ...boot, bootstrap: 'hooks/session-start.mjs' };
      const cmd = command(buildSettingsJson(mjs, {}, 'retail'));
      expect(cmd).toContain('if node --check "$s" 2>/dev/null; then node "$s" --clan retail --run ensure-pre-commit.sh');
      expect(cmd).toContain('gcloud storage cp gs://extenda-agent-artifacts/hooks/session-start.mjs "$s"');
      expect(cmd).not.toContain('bash');
      expect(cmd).toContain('or node is not installed. Install Node.js or run gcloud auth login, then start a new session.');
      expect(cmd.match(/gcloud storage/g)).toHaveLength(1);
      expect(sessionHooks(buildSettingsJson(mjs, {}, 'retail'))[0].timeout).toBe(90);
    });

    test('template mode (clanName=null) passes no --clan', () => {
      expect(command(buildSettingsJson(boot, {}, null))).not.toContain(
        '--clan',
      );
    });

    test('appends clan SessionStart scripts, skipping global file names', () => {
      const clan = {
        hooks: {
          SessionStart: [
            { script: 'hooks/ensure-pre-commit.sh' },
            { script: 'hooks/clan-setup.sh' },
          ],
        },
      };
      const cmd = command(buildSettingsJson(boot, clan, 'retail'));
      expect(cmd.match(/--run ensure-pre-commit\.sh/g)).toHaveLength(1);
      expect(cmd).toMatch(/--baseline' --run clan-setup\.sh;/);
    });

    test('rejects SessionStart args the script cannot split safely', () => {
      const bad = {
        ...boot,
        hooks: { SessionStart: [{ script: 'hooks/x.sh', args: ['a b'] }] },
      };
      expect(() => buildSettingsJson(bad, {}, 'retail')).toThrow(/must match/);
    });

    test('the global schema accepts bootstrap under hooks/', () => {
      const ok = (bootstrap) => validate({ bootstrap }, globalSchema).valid;
      expect(ok('hooks/session-start.sh')).toBe(true);
      expect(ok('hooks/session-start.mjs')).toBe(true);
      expect(ok('hooks/x.js')).toBe(false);
      expect(ok('hooks/sub/x.sh')).toBe(false);
      expect(ok('hooks/foo bar.sh')).toBe(false);
      expect(ok('hooks/$(x).sh')).toBe(false);
    });

    test('without bootstrap it fails instead of generating settings that never sync', () => {
      const { bootstrap: _, ...noBoot } = baseline;
      expect(() => buildSettingsJson(noBoot, {}, 'retail')).toThrow(/no bootstrap/);
      expect(validate({}, globalSchema).valid).toBe(false);
    });
  });

  test('SessionStart timeout is the sum of script timeouts plus the setup allowance', () => {
    const base = {
      ...baseline,
      hooks: { SessionStart: [{ script: 'hooks/a.sh', timeout: 30 }, { script: 'hooks/b.sh', timeout: 120 }] },
    };
    expect(sessionHooks(buildSettingsJson(base, {}, 'retail'))[0].timeout).toBe(210);
  });

  test('hooks are started with bash and tested with -f, never -x', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    const commands = [
      ...sessionCommands(result),
      ...result.hooks.PreToolUse.flatMap((e) => e.hooks.map((h) => h.command)),
    ];
    expect(commands.some((c) => c.includes('bash "'))).toBe(true);
    expect(commands.every((c) => !c.includes('[ -x'))).toBe(true);
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

  test('PreToolUse hooks use [ -f ] and bash, and the guard pattern that propagates the exit code', () => {
    const result = buildSettingsJson(baseline, {}, 'retail');
    const command = result.hooks.PreToolUse[0].hooks[0].command;
    expect(command).toBe(
      '[ -f "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.sh" ] || exit 0;' +
        ' bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.sh"',
    );
    expect(command).not.toMatch(/\|\| exit 0$/);
  });

  test('.mjs hooks are started with node, with the same guard and args', () => {
    const nodeBaseline = {
      bootstrap: 'hooks/session-start.mjs',
      hooks: {
        PreToolUse: [{ matcher: 'Bash', script: 'hooks/tool-guardian.mjs', args: ['--strict'] }],
        SessionStart: [{ script: 'hooks/warm-up.mjs' }],
      },
    };
    const result = buildSettingsJson(nodeBaseline, {}, 'retail');
    expect(result.hooks.PreToolUse[0].hooks[0].command).toBe(
      '[ -f "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.mjs" ] || exit 0;' +
        ' node "${CLAUDE_PROJECT_DIR}/.claude/hooks/tool-guardian.mjs" --strict',
    );
    expect(sessionCommands(result).join('\n')).toContain('--run warm-up.mjs');
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
                '[ -f "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh" ] || exit 0;' +
                ' bash "${CLAUDE_PROJECT_DIR}/.claude/hooks/verify-on-stop.sh"',
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

    test('shell-quotes arguments with unsafe characters', () => {
      const cfg = { bootstrap: 'hooks/session-start.mjs', hooks: { Stop: [{ script: 'hooks/x.sh', args: ['a b', "it's", '$(rm -rf /)', 'plain-1.2'] }] } };
      const command = buildSettingsJson(cfg, {}, 'retail').hooks.Stop[0].hooks[0].command;
      expect(command).toContain(`x.sh" 'a b' 'it'\\''s' '$(rm -rf /)' plain-1.2`);
    });

    test('clan Stop hooks append after global and are downloaded', () => {
      const clan = { hooks: { Stop: [{ script: 'hooks/clan-stop.sh' }] } };
      const result = buildSettingsJson(withStop, clan, 'retail');
      expect(result.hooks.Stop).toHaveLength(2);
      expect(result.hooks.Stop[1].hooks[0].command).toContain('clan-stop.sh');
    });
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

  test('a null baseline has no bootstrap and fails', () => {
    const clan = { permissions: { allow: ['Bash(./gradlew *)'] }, commands: [] };
    expect(() => buildSettingsJson(null, clan, 'retail')).toThrow(/no bootstrap/);
  });
});

// ── syncClanSettings ─────────────────────────────────────────────────────────

const GLOBAL_YAML = `
bootstrap: hooks/session-start.mjs
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
      existsSync.mockImplementation((p) => p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('config/settings.yaml'));
      readFileSync.mockImplementation((p) => {
        if (p.includes('global/settings.yaml')) return GLOBAL_YAML;
        if (p.includes('config/settings.yaml')) return CLAN_YAML;
        return '';
      });
      // No existing clans in GCS by default
      execGcloud.mockResolvedValue('');
    });

    test('fails before uploading anything when the bootstrap script is missing', async () => {
      readFileSync.mockImplementation((p) =>
        p.includes('global/settings.yaml')
          ? `bootstrap: hooks/session-start.sh\n${GLOBAL_YAML}`
          : '',
      );
      await expect(
        syncClanSettings('/root/agent-registry', [], false, 'platform'),
      ).rejects.toThrow(/bootstrap/);
      expect(upload).not.toHaveBeenCalled();
    });

    test('an agent needs its instructions and global/CLAUDE.md', async () => {
      readFileSync.mockImplementation((p) =>
        p.includes('global/settings.yaml') ? `agent: orchestrator\n${GLOBAL_YAML}` : '');
      existsSync.mockImplementation((p) => p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.endsWith('session-start.mjs')
        || p.includes('agents/orchestrator/instructions.md'));
      await expect(syncClanSettings('/root/agent-registry', [], false, 'platform')).rejects.toThrow(/global\/CLAUDE\.md/);
      expect(upload).not.toHaveBeenCalled();
    });

    test('checkMainAgent fails on a missing agent instructions file, whatever changed', () => {
      readFileSync.mockImplementation((p) =>
        p.includes('global/settings.yaml') ? `agent: orchestrator\n${GLOBAL_YAML}` : '');
      existsSync.mockImplementation((p) => p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('global/CLAUDE.md'));
      expect(() => checkMainAgent('/root/agent-registry')).toThrow(/agents\/orchestrator\/instructions\.md/);
      existsSync.mockReturnValue(true);
      expect(() => checkMainAgent('/root/agent-registry')).not.toThrow();
    });

    test('uploads global/CLAUDE.md as the shared rules, and sets agent in settings.json', async () => {
      readFileSync.mockImplementation((p) =>
        p.includes('global/settings.yaml')
          ? `agent: orchestrator\n${GLOBAL_YAML}`
          : '');
      existsSync.mockImplementation((p) => !p.includes('config/settings.yaml'));
      await syncClanSettings('/root/agent-registry', [], false, '');
      expect(upload).toHaveBeenCalledWith('/root/agent-registry/global/CLAUDE.md', 'CLAUDE.md');
      const json = JSON.parse(writeFileSync.mock.calls.find((c) => String(c[0]).includes('settings.json'))[1]);
      expect(json.agent).toBe('orchestrator');
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
        p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('config/settings.yaml') || p.includes('conventions.md'),
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

    test('uploads review.md to config/<clan>/review.md when it exists', async () => {
      existsSync.mockImplementation((p) =>
        p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('config/settings.yaml') || p.includes('review.md'),
      );
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls).toContain('config/platform/review.md');
      expect(calls.every((p) => !p.includes('conventions.md'))).toBe(true);
    });

    test('skips review upload when review.md does not exist', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const calls = upload.mock.calls.map((c) => c[1]);
      expect(calls.every((p) => !p.includes('review.md'))).toBe(true);
    });

    test('deletes the published review.md when config/review.md is absent', async () => {
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      expect(execGcloud).toHaveBeenCalledWith(
        ['storage', 'rm', 'gs://extenda-agent-artifacts/config/platform/review.md'],
        'gcloud',
        true,
      );
    });

    test('does not delete review.md when config/review.md exists', async () => {
      existsSync.mockImplementation((p) =>
        p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('config/settings.yaml') || p.includes('review.md'),
      );
      await syncClanSettings('/root/agent-registry', [], false, 'platform');
      const rmCalls = execGcloud.mock.calls.filter((c) => c[0][1] === 'rm').map((c) => c[0][2]);
      expect(rmCalls.every((p) => !p.endsWith('/review.md'))).toBe(true);
    });

    test('ignores a missing published review.md', async () => {
      execGcloud.mockImplementation((args) =>
        args[1] === 'rm' ? Promise.reject(new Error('not found')) : Promise.resolve(''),
      );
      await expect(syncClanSettings('/root/agent-registry', [], false, 'platform')).resolves.not.toThrow();
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

    test('fails without uploading when the global baseline cannot be fetched', async () => {
      execGcloud.mockRejectedValue(new Error('not found'));
      await expect(syncClanSettings('/root/agent-registry', [], false, 'retail')).rejects.toThrow(
        /Could not fetch the global baseline/,
      );
      expect(upload).not.toHaveBeenCalled();
    });
  });

  describe('changed-path filtering', () => {
    beforeEach(() => {
      existsSync.mockImplementation((p) => p.endsWith('session-start.mjs') || p.includes('global/settings.yaml') || p.includes('config/settings.yaml'));
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

// ── hook script paths ────────────────────────────────────────────────────────

describe('hook script paths', () => {
  // Scripts are uploaded to hooks/<name> and downloaded by file name only, so a
  // nested path such as hooks/sub/foo.sh would be uploaded to one location and
  // downloaded from another. The schemas therefore only accept flat paths.
  const withHooks = (hooks, schema) =>
    schema === globalSchema ? { bootstrap: 'hooks/session-start.mjs', hooks } : { hooks };

  test.each([
    ['global', globalSchema],
    ['clan', clanSchema],
  ])(
    '%s schema rejects nested script paths in every event',
    (_name, schema) => {
      const nested = 'hooks/sub/foo.sh';
      for (const hooks of [
        { SessionStart: [{ script: nested }] },
        { PreToolUse: [{ matcher: 'Bash', script: nested }] },
        { Stop: [{ script: nested }] },
      ]) {
        expect(validate(withHooks(hooks, schema), schema).valid).toBe(false);
      }
    },
  );

  test.each([
    ['global', globalSchema],
    ['clan', clanSchema],
  ])('%s schema accepts flat script paths', (_name, schema) => {
    const hooks = {
      SessionStart: [{ script: 'hooks/a.sh', args: ['--x'] }],
      PreToolUse: [{ matcher: 'Bash', script: 'hooks/b.sh' }],
      Stop: [{ script: 'hooks/c.sh', timeout: 10 }],
    };
    expect(validate(withHooks(hooks, schema), schema).valid).toBe(true);
  });

  test.each([
    ['global', globalSchema],
    ['clan', clanSchema],
  ])('%s schema accepts .mjs scripts in every event, and no other extension', (_name, schema) => {
    const hooks = {
      SessionStart: [{ script: 'hooks/a.mjs', args: ['--x'] }],
      PreToolUse: [{ matcher: 'Bash', script: 'hooks/b.mjs' }],
      Stop: [{ script: 'hooks/c.mjs', timeout: 10 }],
    };
    expect(validate(withHooks(hooks, schema), schema).valid).toBe(true);
    for (const script of ['hooks/d.js', 'hooks/e.py', 'hooks/f.mjs.bak']) {
      expect(validate(withHooks({ Stop: [{ script }] }, schema), schema).valid).toBe(false);
    }
  });

});
