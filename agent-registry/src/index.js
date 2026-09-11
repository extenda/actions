import * as core from '@actions/core';
import fg from 'fast-glob';
import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { setupGcloud } from '../../setup-gcloud/src/index.js';
import { upload } from './upload-gcs.js';
import { registerAgent } from './register-agent.js';
import { registerMcp } from './register-mcp.js';
import { registerSkill } from './register-skill.js';

const AGENT_REGISTRY_PATH = 'agent-registry';

const getGitSha = () => execSync('git rev-parse HEAD').toString().trim(); // NOSONAR

const getChangedPaths = () => {
  try {
    const base = process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : 'HEAD~1';
    return execSync(`git diff --name-only ${base}...HEAD`).toString().trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
};

const isAffected = (registryRelativePath, changedPaths) =>
  !changedPaths.length ||
  changedPaths.some((p) => p.startsWith(`${AGENT_REGISTRY_PATH}/${registryRelativePath}`));

const processAgents = async (registryRoot, changedPaths, gitSha, dryRun) => {
  const agentFiles = fg.sync('agents/*/agent.yaml', { cwd: registryRoot, onlyFiles: true });
  for (const agentFile of agentFiles) {
    const agentId = path.basename(path.dirname(agentFile));
    if (agentId.startsWith('example-')) continue;
    if (!isAffected(`agents/${agentId}/`, changedPaths)) continue;

    const agentYaml = readFileSync(path.join(registryRoot, agentFile), 'utf8');
    core.startGroup(`Agent: ${agentId}`);
    await registerAgent(agentId, agentYaml, dryRun);

    const instructionsPath = path.join(registryRoot, 'agents', agentId, 'instructions.md');
    if (existsSync(instructionsPath)) {
      const gcsPath = `agents/${agentId}/${gitSha}/instructions.md`;
      if (dryRun) {
        core.info(`[dry-run] Would upload instructions to gs://extenda-agent-artifacts/${gcsPath}`);
      } else {
        await upload(instructionsPath, gcsPath);
        core.info(`Instructions uploaded: gs://extenda-agent-artifacts/${gcsPath}`);
      }
    }
    core.endGroup();
  }
};

const processMcps = async (registryRoot, changedPaths, dryRun) => {
  const mcpFiles = fg.sync('mcp/*/mcp.yaml', { cwd: registryRoot, onlyFiles: true });
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

const processSkills = async (registryRoot, changedPaths, dryRun) => {
  const skillFiles = fg.sync('skills/*/SKILL.md', { cwd: registryRoot, onlyFiles: true });
  for (const skillFile of skillFiles) {
    const skillId = path.basename(path.dirname(skillFile));
    if (skillId.startsWith('example-')) continue;
    if (!isAffected(`skills/${skillId}/`, changedPaths)) continue;

    core.startGroup(`Skill: ${skillId}`);
    await registerSkill(skillId, path.join(registryRoot, skillFile), dryRun);
    core.endGroup();
  }
};

const action = async () => {
  const serviceAccountKey = core.getInput('service-account-key', { required: true });
  const dryRun = core.getInput('dry-run') === 'true';

  await setupGcloud(serviceAccountKey);
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
  await processSkills(registryRoot, changedPaths, dryRun);
};

export { getChangedPaths, isAffected };
export default action;
