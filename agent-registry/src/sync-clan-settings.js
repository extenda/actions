import * as core from '@actions/core';
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { load } from 'js-yaml';
import { validate } from 'jsonschema';
import fg from 'fast-glob';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { upload } from './upload-gcs.js';

import globalSchema from './global-settings.schema.json' with { type: 'json' };
import clanSchema from './clan-settings.schema.json' with { type: 'json' };

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
      ['storage', 'cp', `${GCS}/claude-code/settings.yaml`, tmpPath],
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

  // Fetch clan settings, fall back to global
  cmds.push(hookCmd(
    `gcloud storage cp ${GCS}/clans/${clanName}/settings.json "${CD}/.claude/settings.json" 2>/dev/null` +
    ` || gcloud storage cp ${GCS}/claude-code/settings.json "${CD}/.claude/settings.json" 2>/dev/null`,
  ));

  // Download global hook scripts (PreToolUse only — SessionStart IS this hook)
  for (const entry of (baseline?.hooks?.PreToolUse ?? [])) {
    const s = filename(entry.script);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/hooks/${s} "${CD}/.claude/hooks/${s}" 2>/dev/null`));
  }

  // Download clan hook scripts (SessionStart + PreToolUse)
  const clanHookEntries = [
    ...(clanConfig?.hooks?.SessionStart ?? []),
    ...(clanConfig?.hooks?.PreToolUse ?? []),
  ];
  for (const entry of clanHookEntries) {
    const s = filename(entry.script);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/hooks/${clanName}/${s} "${CD}/.claude/hooks/${s}" 2>/dev/null`));
  }

  // chmod all hooks at once
  cmds.push(hookCmd(`chmod +x "${CD}/.claude/hooks/"*.sh 2>/dev/null`));

  // Fetch orchestrator CLAUDE.md (strip frontmatter, preserve existing on failure)
  cmds.push(hookCmd(
    `tmp=$(mktemp); gcloud storage cat ${GCS}/agents/orchestrator/instructions.md 2>/dev/null` +
    ` | awk '/^---$/{c++;if(c==2){p=1;next}}p' > "$tmp";` +
    ` if [ -s "$tmp" ]; then mv "$tmp" "${CD}/CLAUDE.md"; cp "${CD}/CLAUDE.md" "${CD}/AGENTS.md"; else rm -f "$tmp"; fi`,
  ));

  // Download global commands
  for (const c of (baseline?.commands ?? [])) {
    const f = filename(c);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/commands/${f} "${CD}/.claude/commands/${f}" 2>/dev/null`));
  }

  // Download clan commands
  for (const c of (clanConfig?.commands ?? [])) {
    const f = filename(c);
    cmds.push(hookCmd(`gcloud storage cp ${GCS}/commands/${clanName}/${f} "${CD}/.claude/commands/${f}" 2>/dev/null`));
  }

  // Run clan SessionStart scripts after everything is downloaded
  for (const entry of (clanConfig?.hooks?.SessionStart ?? [])) {
    const s = filename(entry.script);
    cmds.push(hookCmd(`[ -x "${CD}/.claude/hooks/${s}" ] && "${CD}/.claude/hooks/${s}"`));
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

const uploadFiles = async (localDir, gcsPrefix, dryRun) => {
  if (!existsSync(localDir)) return;
  const files = fg.sync('**/*', { cwd: localDir, onlyFiles: true });
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const gcsPath = `${gcsPrefix}/${file}`;
    if (dryRun) {
      core.info(`[dry-run] Would upload ${file} → gs://${GCS_BUCKET}/${gcsPath}`);
    } else {
      await upload(localPath, gcsPath);
      core.info(`Uploaded: gs://${GCS_BUCKET}/${gcsPath}`);
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

  if (!hasGlobal && !hasClan) return;

  const affected = (prefix) =>
    !changedPaths.length || changedPaths.some((p) => p.startsWith(`agent-registry/${prefix}`));

  // --- Global baseline (platform repo only) ---
  if (hasGlobal && affected('global/')) {
    core.startGroup('Global baseline');
    validateSettings('global/settings.yaml', load(readFileSync(globalYamlPath, 'utf8')), globalSchema);

    if (dryRun) {
      core.info(`[dry-run] Would upload global/settings.yaml → gs://${GCS_BUCKET}/claude-code/settings.yaml`);
    } else {
      await upload(globalYamlPath, 'claude-code/settings.yaml');
      core.info(`Global baseline uploaded: gs://${GCS_BUCKET}/claude-code/settings.yaml`);
    }

    await uploadFiles(path.join(registryRoot, 'global', 'hooks'), 'hooks', dryRun);
    await uploadFiles(path.join(registryRoot, 'global', 'commands'), 'commands', dryRun);

    core.endGroup();
  }

  // --- Clan settings ---
  if (!hasClan || !affected('config/')) return;

  const clanYamlContent = readFileSync(clanYamlPath, 'utf8');
  const clanConfig = load(clanYamlContent);
  validateSettings('config/settings.yaml', clanConfig, clanSchema);
  const clanName = clanConfig?.clan ?? clan;

  if (!clanName) throw new Error('config/settings.yaml is missing required field: clan');

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
    core.info(`[dry-run] Would upload merged settings.json for clan: ${clanName}`);
    core.info(JSON.stringify(merged, null, 2));
  } else {
    const jsonTmp = writeTempFile(JSON.stringify(merged, null, 2), 'settings.json');
    try {
      await upload(jsonTmp, `clans/${clanName}/settings.json`);
      core.info(`Clan settings.json uploaded: gs://${GCS_BUCKET}/clans/${clanName}/settings.json`);
    } finally {
      unlinkSync(jsonTmp);
    }

    const yamlTmp = writeTempFile(clanYamlContent, 'settings.yaml');
    try {
      await upload(yamlTmp, `clans/${clanName}/settings.yaml`);
      core.info(`Clan settings.yaml stored: gs://${GCS_BUCKET}/clans/${clanName}/settings.yaml`);
    } finally {
      unlinkSync(yamlTmp);
    }
  }

  await uploadFiles(path.join(registryRoot, 'config', 'hooks'), `hooks/${clanName}`, dryRun);
  await uploadFiles(path.join(registryRoot, 'config', 'commands'), `commands/${clanName}`, dryRun);

  core.endGroup();
};
