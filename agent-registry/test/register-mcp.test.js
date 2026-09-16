import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import * as core from '@actions/core';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

import { registerMcp } from '../src/register-mcp.js';

const MCP_YAML = `
displayName: My MCP Server
description: A test MCP server
specType: tool-spec
spec:
  tools:
    - name: my-tool
      description: Does something
interfaces:
  - protocolBinding: JSONRPC
    url: https://mcp.example.com/jsonrpc
`;

const MCP_YAML_MINIMAL = `
description: Minimal MCP
spec: {}
interfaces:
  - url: https://mcp.example.com
`;

describe('register-mcp', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create path', () => {
    test('calls create when MCP does not exist', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs[2]).toBe('create');
      expect(createArgs[3]).toBe('my-mcp');
    });

    test('includes required flags', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs).toContain('--location=europe-west1');
      expect(createArgs).toContain('--project=extenda');
      expect(createArgs).toContain('--display-name=My MCP Server');
      expect(createArgs).toContain('--description=A test MCP server');
      expect(createArgs).toContain('--mcp-server-spec-type=tool-spec');
    });

    test('serialises spec content as JSON', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML, false);

      const createArgs = execGcloud.mock.calls[1][0];
      const specArg = createArgs.find((a) => a.startsWith('--mcp-server-spec-content='));
      const spec = JSON.parse(specArg.replace('--mcp-server-spec-content=', ''));
      expect(spec.tools[0].name).toBe('my-tool');
    });

    test('includes interface flags', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs).toContain(
        '--interfaces=protocolBinding=JSONRPC,url=https://mcp.example.com/jsonrpc',
      );
    });
  });

  describe('update path', () => {
    test('calls update when MCP already exists', async () => {
      execGcloud.mockResolvedValueOnce(undefined); // describe → exists
      execGcloud.mockResolvedValueOnce(undefined); // update

      await registerMcp('my-mcp', MCP_YAML, false);

      const updateArgs = execGcloud.mock.calls[1][0];
      expect(updateArgs[2]).toBe('update');
      expect(updateArgs[3]).toBe('my-mcp');
    });
  });

  describe('dry-run', () => {
    test('logs and skips all gcloud calls', async () => {
      await registerMcp('my-mcp', MCP_YAML, true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would register MCP: my-mcp');
      expect(execGcloud).not.toHaveBeenCalled();
    });

    test('throws on missing interfaces even in dry-run', async () => {
      await expect(registerMcp('my-mcp', 'spec: {}', true))
        .rejects.toThrow("mcp.yaml for 'my-mcp' is missing required field: interfaces");
    });

    test('throws on interface missing url even in dry-run', async () => {
      const yaml = 'interfaces:\n  - protocolBinding: JSONRPC\n';
      await expect(registerMcp('my-mcp', yaml, true))
        .rejects.toThrow("each interface must have a url");
    });
  });

  describe('defaults', () => {
    test('uses mcpId as displayName when omitted', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML_MINIMAL, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs).toContain('--display-name=my-mcp');
    });

    test('defaults specType to tool-spec', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML_MINIMAL, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs).toContain('--mcp-server-spec-type=tool-spec');
    });

    test('defaults protocolBinding to JSONRPC', async () => {
      const yaml = `
spec: {}
interfaces:
  - url: https://mcp.example.com
`;
      execGcloud.mockRejectedValueOnce(new Error('not found'));
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', yaml, false);

      const createArgs = execGcloud.mock.calls[1][0];
      expect(createArgs).toContain(
        '--interfaces=protocolBinding=JSONRPC,url=https://mcp.example.com',
      );
    });
  });
});
