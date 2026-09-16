import * as core from '@actions/core';
import { load as yamlLoad } from 'js-yaml';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

const PROJECT = 'extenda';
const LOCATION = 'europe-west1';

const serviceExists = async (serviceId) => {
  try {
    await execGcloud(
      ['agent-registry', 'services', 'describe', serviceId, `--location=${LOCATION}`, `--project=${PROJECT}`],
      'gcloud',
      true,
    );
    return true;
  } catch {
    return false;
  }
};

const registerMcp = async (mcpId, mcpYaml, dryRun) => {
  const spec = yamlLoad(mcpYaml) ?? {};
  const displayName = spec.displayName ?? mcpId;
  const description = spec.description ?? '';
  const specType = spec.specType ?? 'tool-spec';
  const specContent = JSON.stringify(spec.spec ?? {});

  if (!spec.interfaces?.length) throw new Error(`mcp.yaml for '${mcpId}' is missing required field: interfaces`);
  const interfaces = spec.interfaces.flatMap((iface) => {
    if (!iface.url) throw new Error(`mcp.yaml for '${mcpId}': each interface must have a url`);
    return [`--interfaces=protocolBinding=${iface.protocolBinding ?? 'JSONRPC'},url=${iface.url}`];
  });

  const flags = [
    `--location=${LOCATION}`,
    `--project=${PROJECT}`,
    `--display-name=${displayName}`,
    `--description=${description}`,
    `--mcp-server-spec-type=${specType}`,
    `--mcp-server-spec-content=${specContent}`,
  ];

  if (dryRun) {
    core.info(`[dry-run] Would register MCP: ${mcpId}`);
    return;
  }

  const exists = await serviceExists(mcpId);

  if (exists) {
    core.info(`Updating MCP: ${mcpId}`);
    await execGcloud(['agent-registry', 'services', 'update', mcpId, ...flags, ...interfaces]);
  } else {
    core.info(`Creating MCP: ${mcpId}`);
    await execGcloud(['agent-registry', 'services', 'create', mcpId, ...flags, ...interfaces]);
  }
  core.info(`MCP registered: ${mcpId}`);
};

export { registerMcp };
