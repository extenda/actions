import * as core from '@actions/core';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';
import { validate } from 'jsonschema';
import fg from 'fast-glob';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from './upload-gcs.js';

import globalSchema from './global-settings.schema.json';
import clanSchema from './clan-settings.schema.json';

const validateSettings = (filePath, data, schema) => {
  const result = validate(data, schema, { nestedErrors: true });
  if (!result.valid) {
    throw new Error(`${filePath} is not valid.\n${result.toString()}`);
  }
};

const GCS_BUCKET = 'extenda-agent-artifacts';
const GCS = `gs://${GCS_BUCKET}`;
const CD = '${CLAUDE_PROJECT_DIR}';

const fetchGlobalBaseline = async () => {
  const tmpPath = path.join(tmpdir(), `global-settings-${process.pid}.yaml`);
  try {
    await execGcloud(
      ['storage', 'cp', `${GCS}/config/settings.yaml`, tmpPath],
      'gcloud',
      true,
    );
    return load(readFileSync(tmpPath, 'utf8'));
  } finally {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }
};

const filename = (scriptPath) => path.basename(scriptPath);

const gcpHook = (script) =>
  `[ -x "${CD}/.claude/hooks/${script}" ] && "${CD}/.claude/hooks/${script}" || exit 0`;

const hookCmd = (command) => ({ type: 'command', command });

const buildSessionStartHooks = (baseline, clanConfig, clanName) => {
  const cmds = [];

  // Setup
  cmds.push(hookCmd(`mkdir -p "${CD}/.claude/hooks" "${CD}/.claude/commands"`));

  // Fetch clan-specific settings.json (self-updates this file on next session).
  // Template mode (clanName=null): derive clan at runtime from discovered.md.
  // Clan mode: hardcoded path — no fallback needed, bootstrap gap handled gracefully.
  if (clanName) {
    cmds.push(hookCmd(
      `gcloud storage cp ${GCS}/config/${clanName}/settings.json "${CD}/.claude/settings.json" 2>/dev/null || true`,
    ));
  } else {
    cmds.push(hookCmd(
      `CLAN=$(sed -n 's/.*\\*\\*Clan:\\*\\* \\([a-z0-9-]*\\).*/\\1/p' "${CD}/.agent/discovered.md" 2>/dev/null);` +
      ` [ -n "$CLAN" ] && gcloud storage cp ${GCS}/config/$CLAN/settings.json "${CD}/.claude/settings.json" 2>/dev/null` +
      ` || gcloud storage cp ${GCS}/config/settings.json "${CD}/.claude/settings.json" 2>/dev/null || true`,
    ));
  }

  // Download global hook scripts (SessionStart + PreToolUse)
  for (const entry of [
    ...(baseline?.hooks?.SessionStart ?? []),
    ...(baseline?.hooks?.PreToolUse ?? []),
  ]) {
    const s = filename(entry.script);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/hooks/${s} "${CD}/.claude/hooks/${s}" 2>/dev/null || true`));
  }

  // Download clan hook scripts (SessionStart + PreToolUse) — global filenames take precedence
  if (clanName) {
    const globalHookNames = new Set([
      ...(baseline?.hooks?.SessionStart ?? []),
      ...(baseline?.hooks?.PreToolUse ?? []),
    ].map((e) => filename(e.script)));

    const clanHookEntries = [
      ...(clanConfig?.hooks?.SessionStart ?? []),
      ...(clanConfig?.hooks?.PreToolUse ?? []),
    ];
    for (const entry of clanHookEntries) {
      const s = filename(entry.script);
      if (globalHookNames.has(s)) continue;
      cmds.push(hookCmd(`gcloud storage cp ${GCS}/hooks/${clanName}/${s} "${CD}/.claude/hooks/${s}" 2>/dev/null || true`));
    }
  }

  // chmod all hooks at once
  cmds.push(hookCmd(`chmod +x "${CD}/.claude/hooks/"*.sh 2>/dev/null || true`));

  // Fetch orchestrator CLAUDE.md (strip frontmatter, preserve existing on failure)
  cmds.push(hookCmd(
    `tmp=$(mktemp); gcloud storage cat ${GCS}/agents/orchestrator/instructions.md 2>/dev/null` +
    ` | awk '/^---$/{c++;if(c==2){p=1;next}}p' > "$tmp";` +
    ` if [ -s "$tmp" ]; then mv "$tmp" "${CD}/CLAUDE.md"; cp "${CD}/CLAUDE.md" "${CD}/AGENTS.md"; else rm -f "$tmp"; fi`,
  ));

  // Download global commands
  for (const c of (baseline?.commands ?? [])) {
    const f = filename(c);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/commands/${f} "${CD}/.claude/commands/${f}" 2>/dev/null || true`));
  }

  // Download clan commands — global filenames take precedence
  if (clanName) {
    const globalCommandNames = new Set((baseline?.commands ?? []).map((c) => filename(c)));
    for (const c of (clanConfig?.commands ?? [])) {
      const f = filename(c);
      if (globalCommandNames.has(f)) continue;
      cmds.push(hookCmd(`gcloud storage cp ${GCS}/commands/${clanName}/${f} "${CD}/.claude/commands/${f}" 2>/dev/null || true`));
    }
  }

  // Download clan conventions (clan-specific settings.json only)
  if (clanName) {
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/config/${clanName}/conventions.md "${CD}/.agent/conventions.md" 2>/dev/null || true`));
  }

  // Run global SessionStart scripts, then clan SessionStart scripts
  for (const entry of (baseline?.hooks?.SessionStart ?? [])) {
    const s = filename(entry.script);
    cmds.push(hookCmd(`[ -x "${CD}/.claude/hooks/${s}" ] && "${CD}/.claude/hooks/${s}" || true`));
  }
  if (clanName) {
    const globalSessionNames = new Set((baseline?.hooks?.SessionStart ?? []).map((e) => filename(e.script)));
    for (const entry of (clanConfig?.hooks?.SessionStart ?? [])) {
      const s = filename(entry.script);
      if (globalSessionNames.has(s)) continue;
      cmds.push(hookCmd(`[ -x "${CD}/.claude/hooks/${s}" ] && "${CD}/.claude/hooks/${s}" || true`));
    }
  }

  return cmds;
};

export const buildSettingsJson = (baseline, clanConfig, clanName) => {
  const basePerms = baseline?.permissions?.allow ?? [];
  const clanPerms = clanConfig?.permissions?.allow ?? [];
  const allPerms = [...new Set([...basePerms, ...clanPerms])];

  const preToolUse = [
    ...(baseline?.hooks?.PreToolUse ?? []).map((e) => ({
      matcher: e.matcher,
      hooks: [{ type: 'command', command: gcpHook(filename(e.script)) }],
    })),
    ...(clanConfig?.hooks?.PreToolUse ?? []).map((e) => ({
      matcher: e.matcher,
      hooks: [{ type: 'command', command: gcpHook(filename(e.script)) }],
    })),
  ];

  return {
    permissions: { allow: allPerms },
    hooks: {
      SessionStart: [{ hooks: buildSessionStartHooks(baseline, clanConfig, clanName) }],
      ...(preToolUse.length ? { PreToolUse: preToolUse } : {}),
    },
  };
};

const syncFiles = async (localDir, gcsPrefix, dryRun) => {
  const localFiles = existsSync(localDir)
    ? fg.sync('**/*', { cwd: localDir, onlyFiles: true })
    : [];

  for (const file of localFiles) {
    const localPath = path.join(localDir, file);
    const gcsPath = `${gcsPrefix}/${file}`;
    if (dryRun) {
      core.info(`[dry-run] Would upload ${file} → gs://${GCS_BUCKET}/${gcsPath}`);
    } else {
      await upload(localPath, gcsPath);
      core.info(`Uploaded: gs://${GCS_BUCKET}/${gcsPath}`);
    }
  }

  // Delete GCS objects no longer present locally (non-recursive — subdirs owned by other clans are untouched)
  let gcsFiles;
  try {
    const lsOut = await execGcloud(['storage', 'ls', `${GCS}/${gcsPrefix}/`], 'gcloud', true);
    gcsFiles = (lsOut || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('gs://') && !l.endsWith('/'))
      .map((l) => l.replace(`gs://${GCS_BUCKET}/${gcsPrefix}/`, ''))
      .filter(Boolean);
  } catch {
    return; // prefix not in GCS yet — nothing to delete
  }

  const localSet = new Set(localFiles);
  for (const f of gcsFiles) {
    if (!localSet.has(f)) {
      const gcsPath = `${gcsPrefix}/${f}`;
      if (dryRun) {
        core.info(`[dry-run] Would delete gs://${GCS_BUCKET}/${gcsPath}`);
      } else {
        await execGcloud(['storage', 'rm', `${GCS}/${gcsPath}`], 'gcloud', true);
        core.info(`Deleted: gs://${GCS_BUCKET}/${gcsPath}`);
      }
    }
  }
};

const writeTempFile = (content, suffix) => {
  const tmpPath = path.join(tmpdir(), `${suffix}-${process.pid}`);
  writeFileSync(tmpPath, content, 'utf8');
  return tmpPath;
};

export const syncClanSettings = async (registryRoot, changedPaths, dryRun, clan) => {
  const globalYamlPath = path.join(registryRoot, 'global', 'settings.yaml');
  const clanYamlPath = path.join(registryRoot, 'config', 'settings.yaml');

  const hasGlobal = existsSync(globalYamlPath);
  const hasClan = existsSync(clanYamlPath);

  if (!hasGlobal && !hasClan && !clan) return;

  const affected = (prefix) =>
    !changedPaths.length || changedPaths.some((p) => p.startsWith(`agent-registry/${prefix}`));

  // --- Global baseline (platform repo only) ---
  if (hasGlobal && affected('global/')) {
    core.startGroup('Global baseline');
    const globalConfig = load(readFileSync(globalYamlPath, 'utf8'));
    validateSettings('global/settings.yaml', globalConfig, globalSchema);

    await syncFiles(path.join(registryRoot, 'global', 'hooks'), 'hooks', dryRun);
    await syncFiles(path.join(registryRoot, 'global', 'commands'), 'commands', dryRun);

    // Upload raw global YAML for clan repos that need to fetch the baseline
    if (dryRun) {
      core.info(`[dry-run] Would upload global/settings.yaml → gs://${GCS_BUCKET}/config/settings.yaml`);
    } else {
      await upload(globalYamlPath, 'config/settings.yaml');
      core.info(`Global baseline uploaded: gs://${GCS_BUCKET}/config/settings.yaml`);
    }

    // Build and upload the global settings.json (clan-agnostic; derives clan at runtime)
    const globalJson = buildSettingsJson(globalConfig, {}, null);
    const globalJsonStr = JSON.stringify(globalJson, null, 2);
    if (dryRun) {
      core.info(`[dry-run] Would upload settings.json → gs://${GCS_BUCKET}/config/settings.json`);
    } else {
      const tmpPath = writeTempFile(globalJsonStr, 'settings.json');
      try {
        await upload(tmpPath, 'config/settings.json');
        core.info(`Global settings.json uploaded: gs://${GCS_BUCKET}/config/settings.json`);
      } finally {
        unlinkSync(tmpPath);
      }
    }

    // Rebuild settings.json for all clans that have already pushed config/<clan>/settings.yaml
    try {
      const lsOutput = await execGcloud(
        ['storage', 'ls', `${GCS}/config/`],
        'gcloud',
        true,
      );
      const clanNames = (lsOutput || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.endsWith('/') && l.includes('/config/'))
        .map((l) => l.replace(/.*\/config\/([^/]+)\/$/, '$1'))
        .filter(Boolean);

      for (const clanName of clanNames) {
        const tmpYamlPath = path.join(tmpdir(), `clan-yaml-${clanName}-${process.pid}`);
        try {
          await execGcloud(
            ['storage', 'cp', `${GCS}/config/${clanName}/settings.yaml`, tmpYamlPath],
            'gcloud',
            true,
          );
          const clanConfig = load(readFileSync(tmpYamlPath, 'utf8'));
          const merged = buildSettingsJson(globalConfig, clanConfig, clanName);
          if (dryRun) {
            core.info(`[dry-run] Would rebuild config/${clanName}/settings.json`);
          } else {
            const tmpJsonPath = writeTempFile(JSON.stringify(merged, null, 2), `settings-${clanName}.json`);
            try {
              await upload(tmpJsonPath, `config/${clanName}/settings.json`);
              core.info(`Rebuilt: gs://${GCS_BUCKET}/config/${clanName}/settings.json`);
            } finally {
              unlinkSync(tmpJsonPath);
            }
          }
        } catch (e) {
          core.warning(`Skipped rebuilding ${clanName}: ${e.message}`);
        } finally {
          try { unlinkSync(tmpYamlPath); } catch { /* ignore */ }
        }
      }
    } catch (e) {
      core.warning(`Could not list GCS clans for rebuild: ${e.message}`);
    }

    core.endGroup();
  }

  // --- Clan settings ---
  // Run when there is a local config/settings.yaml (custom hooks/commands) OR
  // when the caller provides a clan name (no yaml = global-only merge).
  if (!hasClan && !clan) return;
  if (hasClan && !affected('config/')) return;

  let clanYamlContent, clanConfig, clanName;
  if (hasClan) {
    clanYamlContent = readFileSync(clanYamlPath, 'utf8');
    clanConfig = load(clanYamlContent);
    validateSettings('config/settings.yaml', clanConfig, clanSchema);
    clanName = clanConfig?.clan ?? clan;
  } else {
    clanConfig = {};
    clanName = clan;
  }

  if (!clanName) throw new Error('config/settings.yaml is not valid: missing clan field');

  core.startGroup(`Clan settings: ${clanName}`);

  let baseline;
  if (hasGlobal) {
    baseline = load(readFileSync(globalYamlPath, 'utf8'));
    core.info('Using local global/settings.yaml as baseline');
  } else {
    try {
      baseline = await fetchGlobalBaseline();
      core.info('Fetched global baseline from GCS');
    } catch (e) {
      core.warning(`Could not fetch global baseline from GCS: ${e.message}. Using empty baseline.`);
      baseline = { permissions: { allow: [] }, hooks: {} };
    }
  }

  const merged = buildSettingsJson(baseline, clanConfig, clanName);

  if (dryRun) {
    core.info(`[dry-run] Would upload settings.json → gs://${GCS_BUCKET}/config/${clanName}/settings.json`);
  } else {
    const jsonTmp = writeTempFile(JSON.stringify(merged, null, 2), 'settings.json');
    try {
      await upload(jsonTmp, `config/${clanName}/settings.json`);
      core.info(`Clan settings.json uploaded: gs://${GCS_BUCKET}/config/${clanName}/settings.json`);
    } finally {
      unlinkSync(jsonTmp);
    }

    // Always upload settings.yaml (empty when no local clan yaml) so global-change rebuild can find this clan
    const yamlContent = hasClan ? clanYamlContent : '';
    const yamlTmp = writeTempFile(yamlContent, 'settings.yaml');
    try {
      await upload(yamlTmp, `config/${clanName}/settings.yaml`);
      core.info(`Clan settings.yaml stored: gs://${GCS_BUCKET}/config/${clanName}/settings.yaml`);
    } finally {
      unlinkSync(yamlTmp);
    }
  }

  await syncFiles(path.join(registryRoot, 'config', 'hooks'), `hooks/${clanName}`, dryRun);
  await syncFiles(path.join(registryRoot, 'config', 'commands'), `commands/${clanName}`, dryRun);

  const conventionsPath = path.join(registryRoot, 'config', 'conventions.md');
  if (existsSync(conventionsPath)) {
    if (dryRun) {
      core.info(`[dry-run] Would upload conventions.md → gs://${GCS_BUCKET}/config/${clanName}/conventions.md`);
    } else {
      await upload(conventionsPath, `config/${clanName}/conventions.md`);
      core.info(`Conventions uploaded: gs://${GCS_BUCKET}/config/${clanName}/conventions.md`);
    }
  }

  core.endGroup();
};
