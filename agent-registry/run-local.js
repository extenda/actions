#!/usr/bin/env node
// Local test runner — uses ambient gcloud auth, no service account key needed.
// Usage: node run-local.js <path-to-repo-root> [--dry-run]
//
// Example:
//   node run-local.js /Users/alex/projects/extenda/common/engineering-platform-common --dry-run

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import fg from 'fast-glob';

import { registerAgent } from './src/register-agent.js';
import { registerMcp } from './src/register-mcp.js';
import { registerSkill } from './src/register-skill.js';
import { upload } from './src/upload-gcs.js';

const args = process.argv.slice(2);
const repoRoot = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');

if (!repoRoot) {
  console.error('Usage: node run-local.js <path-to-repo-root> [--dry-run]');
  process.exit(1);
}

process.chdir(repoRoot);

const gitSha = execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
const registryRoot = path.join(repoRoot, 'agent-registry');

console.log(`Repo:     ${repoRoot}`);
console.log(`Git SHA:  ${gitSha}`); // used for agent instructions GCS path
console.log(`Dry-run:  ${dryRun}`);
console.log(`Registry: ${registryRoot}`);

// --- Agents ---
const agentFiles = fg.sync('agents/*/agent.yaml', { cwd: registryRoot, onlyFiles: true });
for (const agentFile of agentFiles) {
  const agentId = path.basename(path.dirname(agentFile));
  if (agentId.startsWith('example-')) continue;

  console.log(`\n▶ Agent: ${agentId}`);
  const agentYaml = readFileSync(path.join(registryRoot, agentFile), 'utf8');
  await registerAgent(agentId, agentYaml, dryRun);

  const instructionsPath = path.join(registryRoot, 'agents', agentId, 'instructions.md');
  try {
    readFileSync(instructionsPath);
    const gcsPath = `agents/${agentId}/${gitSha}/instructions.md`;
    if (dryRun) {
      console.log(`  [dry-run] Would upload to gs://extenda-agent-artifacts/${gcsPath}`);
    } else {
      await upload(instructionsPath, gcsPath);
    }
  } catch {
    // instructions.md is optional
  }
}

// --- MCPs ---
const mcpFiles = fg.sync('mcp/*/mcp.yaml', { cwd: registryRoot, onlyFiles: true });
for (const mcpFile of mcpFiles) {
  const mcpId = path.dirname(mcpFile).replace(/^mcp\//, '');
  if (mcpId.startsWith('example-')) continue;

  console.log(`\n▶ MCP: ${mcpId}`);
  const mcpYaml = readFileSync(path.join(registryRoot, mcpFile), 'utf8');
  await registerMcp(mcpId, mcpYaml, dryRun);
}

// --- Skills ---
const skillFiles = fg.sync('skills/*/SKILL.md', { cwd: registryRoot, onlyFiles: true });
for (const skillFile of skillFiles) {
  const skillId = path.basename(path.dirname(skillFile));
  if (skillId.startsWith('example-')) continue;

  console.log(`\n▶ Skill: ${skillId}`);
  const skillFilePath = path.join(registryRoot, skillFile);
  await registerSkill(skillId, skillFilePath, dryRun);
}

console.log('\n✓ Done');
