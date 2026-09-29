import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import fg from 'fast-glob';

import projectInfo from '../../cloud-run/src/project-info.js';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { registerAgent } from './register-agent.js';
import {
  readConvention,
  registerConvention,
  uploadConventionIndex,
} from './register-convention.js';
import { registerMcp } from './register-mcp.js';
import { registerSkill } from './register-skill.js';
import { upload } from './upload-gcs.js';

const AGENT_REGISTRY_PATH = 'agent-registry';

const getGitSha = () => execSync('git rev-parse HEAD').toString().trim(); // NOSONAR

const getChangedPaths = () => {
  try {
    const base = process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : 'HEAD~1';
    return execSync(`git diff --name-only ${base}...HEAD`)
      .toString()
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
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

const processSkills = async (registryRoot, changedPaths, dryRun, clan) => {
  const skillDirs = fg.sync('skills/*', {
    cwd: registryRoot,
    onlyDirectories: true,
  });
  for (const skillDir of skillDirs) {
    const skillId = path.basename(skillDir);
    if (skillId.startsWith('example-')) continue;
    if (!isAffected(`skills/${skillId}/`, changedPaths)) continue;

    core.startGroup(`Skill: ${skillId}`);
    await registerSkill(
      skillId,
      path.join(registryRoot, skillDir),
      dryRun,
      clan,
    );
    core.endGroup();
  }
};

const processConventions = async (
  registryRoot,
  changedPaths,
  gitSha,
  dryRun,
  clan,
) => {
  const conventionDirs = fg.sync('conventions/*', {
    cwd: registryRoot,
    onlyDirectories: true,
  });
  const conventions = [];
  for (const dir of conventionDirs) {
    const conventionId = path.basename(dir);
    if (conventionId.startsWith('example-')) continue;

    // Every convention is read so the index is complete, but only changed ones are uploaded.
    const conventionDir = path.join(registryRoot, dir);
    conventions.push({
      id: conventionId,
      ...readConvention(conventionId, conventionDir),
    });
    if (!isAffected(`conventions/${conventionId}/`, changedPaths)) continue;

    core.startGroup(`Convention: ${conventionId}`);
    await registerConvention(conventionId, conventionDir, gitSha, dryRun, clan);
    core.endGroup();
  }

  // A deleted convention only shows up as a changed path, so the index is rebuilt on any change
  // under conventions/. With no diff available, skip clans that have no conventions at all.
  if (!isAffected('conventions/', changedPaths)) return;
  if (!changedPaths.length && !conventions.length) return;
  await uploadConventionIndex(clan, conventions, dryRun);
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

  if (changedPaths.length) {
    core.info(`Changed paths: ${changedPaths.join(', ')}`);
  } else {
    core.info('No changed paths detected — processing all items');
  }

  const registryRoot = path.join(process.cwd(), AGENT_REGISTRY_PATH);
  await processAgents(registryRoot, changedPaths, gitSha, dryRun);
  await processMcps(registryRoot, changedPaths, dryRun);
  await processSkills(registryRoot, changedPaths, dryRun, clan);
  await processConventions(registryRoot, changedPaths, gitSha, dryRun, clan);
};

export { getChangedPaths, isAffected };
export default action;
