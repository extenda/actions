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
    test('prints create message when MCP does not exist', async () => {
      execGcloud.mockRejectedValueOnce(new Error('not found'));

      await registerMcp('my-mcp', MCP_YAML, true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would create MCP: my-mcp');
      expect(execGcloud).toHaveBeenCalledTimes(1);
    });

    test('prints update message when MCP already exists', async () => {
      execGcloud.mockResolvedValueOnce(undefined);

      await registerMcp('my-mcp', MCP_YAML, true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would update MCP: my-mcp');
      expect(execGcloud).toHaveBeenCalledTimes(1);
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
