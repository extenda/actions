import * as core from '@actions/core';
import { load as yamlLoad } from 'js-yaml';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const PROJECT = 'extenda';
const LOCATION = 'europe-west1';

const isMajorBranch = () => {
  const branch = process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || '';
  return /^(breaking|major)(\/|$)/i.test(branch);
};

const bumpVersion = (version) => {
  const [major, minor] = version.split('.').map(Number);
  return isMajorBranch() ? `${major + 1}.0` : `${major}.${minor + 1}`;
};

const serviceExists = async (serviceId) => {
  try {
    await execGcloud(
      ['agent-registry', 'services', 'describe', serviceId, `--location=${LOCATION}`, `--project=${PROJECT}`],
      'gcloud', true,
    );
    return true;
  } catch { return false; }
};

const getAgentVersion = async (agentId) => {
  try {
    const output = await execGcloud(
      ['agent-registry', 'services', 'describe', agentId,
        `--location=${LOCATION}`, `--project=${PROJECT}`,
        '--format=value(agentSpec.content.version)'],
      'gcloud', true,
    );
    return output.trim() || null;
  } catch { return null; }
};

const registerAgent = async (agentId, agentYaml, dryRun) => {
  const card = yamlLoad(agentYaml) ?? {};
  if (!card.url) throw new Error(`agent.yaml for '${agentId}' is missing required field: url`);
  const displayName = card.displayName ?? agentId;
  const description = card.description ?? '';

  const exists = await serviceExists(agentId);
  const currentVersion = exists ? await getAgentVersion(agentId) : null;
  const version = currentVersion ? bumpVersion(currentVersion) : '0.1';

  if (dryRun) {
    const versionAction = exists ? `update to ${version}` : `create at ${version}`;
    core.info(`[dry-run] Would ${versionAction} agent: ${agentId}`);
    return;
  }

  const specContent = JSON.stringify({
    name: agentId,
    displayName,
    description,
    url: card.url ?? '',
    protocolVersion: '0.3',
    version,
    skills: (card.skills ?? []).map((s) => ({
      id: s.id ?? s,
      name: s.name ?? s.id ?? s,
      description: s.description ?? '',
      tags: s.tags ?? [],
      examples: s.examples ?? [],
    })),
    capabilities: card.capabilities ?? {},
    defaultInputModes: card.defaultInputModes ?? ['text/plain'],
    defaultOutputModes: card.defaultOutputModes ?? ['text/plain'],
  });

  const flags = [
    `--location=${LOCATION}`,
    `--project=${PROJECT}`,
    `--display-name=${displayName}`,
    `--description=${description}`,
    '--agent-spec-type=a2a-agent-card',
    `--agent-spec-content=${specContent}`,
  ];

  const interfaces = (card.interfaces ?? []).flatMap((iface) => [
    `--interfaces=protocolBinding=${iface.protocolBinding ?? 'a2a'},url=${iface.url}`,
  ]);

  if (exists) {
    core.info(`Updating agent: ${agentId}@${version}`);
    await execGcloud(['agent-registry', 'services', 'update', agentId, ...flags, ...interfaces]);
  } else {
    core.info(`Creating agent: ${agentId}@${version}`);
    await execGcloud(['agent-registry', 'services', 'create', agentId, ...flags, ...interfaces]);
  }
  core.info(`Agent registered: ${agentId}@${version}`);
};

export { registerAgent };
