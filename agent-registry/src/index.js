import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import fg from 'fast-glob';

import projectInfo from '../../cloud-run/src/project-info.js';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { deleteSkills } from './delete-skills.js';
import { registerAgent } from './register-agent.js';
import { registerMcp } from './register-mcp.js';
import { registerSkill } from './register-skill.js';
import { syncClanSettings } from './sync-clan-settings.js';
import { upload } from './upload-gcs.js';

const AGENT_REGISTRY_PATH = 'agent-registry';

const getGitSha = () => execSync('git rev-parse HEAD').toString().trim(); // NOSONAR

const getChangedPaths = () => {
  try {
    const base = process.env.GITHUB_BASE_SHA || 'HEAD~1';
    return execSync(`git diff --name-only ${base}...HEAD`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
};

// --no-renames reports a renamed skill directory as a delete of the old path plus an add of the new one.
const getDeletedPaths = () => {
  try {
    const base = process.env.GITHUB_BASE_SHA || 'HEAD~1';
    return execSync(
      `git diff --name-only --no-renames --diff-filter=D ${base}...HEAD`,
    )
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    core.warning(
      `Could not compute deleted files (${e.message?.split('\n')[0]}); skill deletions were not checked. ` +
        'Ensure the checkout uses fetch-depth: 2.',
    );
    return [];
  }
};

// Skill ids whose SKILL.md was deleted in the diff and is not present in the checkout (e.g. re-added).
const getDeletedSkillIds = (registryRoot, deletedPaths) => {
  const pattern = new RegExp(
    `^${AGENT_REGISTRY_PATH}/skills/([^/]+)/SKILL\\.md$`,
  );
  const ids = deletedPaths
    .map((p) => p.match(pattern)?.[1])
    .filter((id) => id && !id.startsWith('example-'))
    .filter(
      (id) => !existsSync(path.join(registryRoot, 'skills', id, 'SKILL.md')),
    );
  return [...new Set(ids)];
};

const isAffected = (registryRelativePath, changedPaths) =>
  !changedPaths.length ||
  changedPaths.some((p) =>
    p.startsWith(`${AGENT_REGISTRY_PATH}/${registryRelativePath}`),
  );

const uploadInstructions = async (
  instructionsPath,
  agentId,
  gitSha,
  dryRun,
) => {
  const versionedPath = `agents/${agentId}/${gitSha}/instructions.md`;
  const latestPath = `agents/${agentId}/instructions.md`;
  if (dryRun) {
    core.info(
      `[dry-run] Would upload instructions to gs://extenda-agent-artifacts/${latestPath}`,
    );
  } else {
    await upload(instructionsPath, versionedPath);
    await upload(instructionsPath, latestPath);
    core.info(
      `Instructions uploaded: gs://extenda-agent-artifacts/${latestPath}`,
    );
  }
};

const processAgents = async (registryRoot, changedPaths, gitSha, dryRun) => {
  const agentFiles = fg.sync('agents/*/agent.yaml', {
    cwd: registryRoot,
    onlyFiles: true,
  });
  for (const agentFile of agentFiles) {
    const agentId = path.basename(path.dirname(agentFile));
    if (agentId.startsWith('example-')) continue;
    if (!isAffected(`agents/${agentId}/`, changedPaths)) continue;

    const agentYaml = readFileSync(path.join(registryRoot, agentFile), 'utf8');
    core.startGroup(`Agent: ${agentId}`);
    await registerAgent(agentId, agentYaml, dryRun);

    const instructionsPath = path.join(
      registryRoot,
      'agents',
      agentId,
      'instructions.md',
    );
    if (existsSync(instructionsPath)) {
      await uploadInstructions(instructionsPath, agentId, gitSha, dryRun);
    }
    core.endGroup();
  }
};

const processMcps = async (registryRoot, changedPaths, dryRun) => {
  const mcpFiles = fg.sync('mcp/*/mcp.yaml', {
    cwd: registryRoot,
    onlyFiles: true,
  });
  for (const mcpFile of mcpFiles) {
    const mcpId = path.dirname(mcpFile).replace(/^mcp\//, '');
    if (mcpId.startsWith('example-')) continue;
    if (!isAffected(`mcp/${mcpId}/`, changedPaths)) continue;

    const mcpYaml = readFileSync(path.join(registryRoot, mcpFile), 'utf8');
    core.startGroup(`MCP: ${mcpId}`);
    await registerMcp(mcpId, mcpYaml, dryRun);
    core.endGroup();
  }
};

// A failing skill (invalid, over a limit, registry error) must not stop the other skills, deletions or clan settings.
// Failures are collected and reported once at the end of the run.
const processSkills = async (registryRoot, changedPaths, dryRun, clan) => {
  const failures = [];
  const skillFiles = fg.sync('skills/*/SKILL.md', {
    cwd: registryRoot,
    onlyFiles: true,
  });
  for (const skillFile of skillFiles) {
    const skillId = path.basename(path.dirname(skillFile));
    if (skillId.startsWith('example-')) continue;
    if (!isAffected(`skills/${skillId}/`, changedPaths)) continue;

    core.startGroup(`Skill: ${skillId}`);
    try {
      await registerSkill(
        skillId,
        path.join(registryRoot, skillFile),
        dryRun,
        clan,
      );
    } catch (e) {
      const message = e.message?.split('\n')[0] ?? String(e);
      core.error(`Skill '${skillId}' failed: ${message}`);
      failures.push({ skillId, message });
    } finally {
      core.endGroup();
    }
  }
  return failures;
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', {
    required: true,
  });
  const dryRun = core.getInput('dry-run') === 'true';

  const projectId = await setupGcloud(serviceAccountKey);
  const { project: clan } = projectInfo(projectId);
  core.info(`Clan namespace: ${clan}`);

  await execGcloud([
    'components',
    'install',
    'alpha',
    '--quiet',
    '--no-user-output-enabled',
  ]);
  const gitSha = getGitSha();
  const changedPaths = getChangedPaths();

  const registryPaths = changedPaths.filter((p) =>
    p.startsWith(AGENT_REGISTRY_PATH),
  );
  if (changedPaths.length && !registryPaths.length) {
    core.info('No agent-registry changes detected — skipping');
  } else if (!changedPaths.length) {
    core.info('No changed paths detected — processing all items');
  }

  const registryRoot = path.join(process.cwd(), AGENT_REGISTRY_PATH);
  await processAgents(registryRoot, changedPaths, gitSha, dryRun);
  await processMcps(registryRoot, changedPaths, dryRun);
  const skillFailures = await processSkills(
    registryRoot,
    changedPaths,
    dryRun,
    clan,
  );
  // Deletions are not in the registered set, so they are read from the diff separately.
  const deletedSkillIds = getDeletedSkillIds(registryRoot, getDeletedPaths());
  if (deletedSkillIds.length) {
    core.startGroup('Delete removed skills');
    await deleteSkills(deletedSkillIds, dryRun, clan);
    core.endGroup();
  }
  await syncClanSettings(registryRoot, changedPaths, dryRun, clan);
  if (skillFailures.length) {
    core.setFailed(
      `${skillFailures.length} skill(s) failed: ${skillFailures
        .map((f) => `${f.skillId} (${f.message})`)
        .join('; ')}`,
    );
  }
};

export { getChangedPaths, getDeletedPaths, getDeletedSkillIds, isAffected };
export default action;
