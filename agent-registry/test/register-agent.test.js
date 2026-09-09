import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import * as core from '@actions/core';
import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';

import { registerAgent } from '../src/register-agent.js';

const AGENT_YAML = `
displayName: Test Agent
description: A test agent
url: https://agent.example.com
skills:
  - id: my-skill
    name: My Skill
    description: Does something useful
    tags: [tag1, tag2]
    examples: ['Do something']
capabilities:
  streaming: true
interfaces:
  - protocolBinding: a2a
    url: https://agent.example.com/a2a
`;

const AGENT_YAML_MINIMAL = `
url: https://minimal.example.com
`;

const call = (n) => execGcloud.mock.calls[n][0];

// Mock sequences for common scenarios:
// New agent:      serviceExists(throws) → create
// Existing agent: serviceExists(ok) → getAgentVersion(ok) → update
const mockNew = () => {
  execGcloud.mockRejectedValueOnce(new Error('not found')); // serviceExists
};
const mockExisting = (version = '0.1') => {
  execGcloud.mockResolvedValueOnce(''); // serviceExists
  execGcloud.mockResolvedValueOnce(version); // getAgentVersion
};

describe('register-agent', () => {
  beforeEach(() => {
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REF_NAME;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('new agent — version 0.1', () => {
    test('creates at 0.1 when agent does not exist', async () => {
      mockNew();
      execGcloud.mockResolvedValueOnce(''); // create

      await registerAgent('my-agent', AGENT_YAML, false);

      expect(call(1)[2]).toBe('create');
      const spec = JSON.parse(call(1).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('0.1');
    });

    test('includes required A2A spec fields', async () => {
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(1).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.protocolVersion).toBe('0.3');
      expect(spec.url).toBe('https://agent.example.com');
      expect(spec.displayName).toBe('Test Agent');
      expect(spec.skills).toHaveLength(1);
      expect(spec.skills[0]).toMatchObject({ id: 'my-skill', tags: ['tag1', 'tag2'] });
    });

    test('includes interface flags', async () => {
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      expect(call(1)).toContain('--interfaces=protocolBinding=a2a,url=https://agent.example.com/a2a');
    });
  });

  describe('existing agent — minor bump (default)', () => {
    test('bumps minor from 0.1 to 0.2', async () => {
      mockExisting('0.1');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('0.2');
      expect(call(2)[2]).toBe('update');
    });

    test('handles three-part version from registry (0.1.0 → 0.2)', async () => {
      mockExisting('0.1.0');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('0.2');
    });

    test('bumps minor across multiple existing versions', async () => {
      mockExisting('0.5');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('0.6');
    });
  });

  describe('existing agent — major bump', () => {
    test('bumps major on breaking/ branch', async () => {
      process.env.GITHUB_HEAD_REF = 'breaking/redesign';
      mockExisting('0.3');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('1.0');
    });

    test('bumps major on major/ branch', async () => {
      process.env.GITHUB_HEAD_REF = 'major/overhaul';
      mockExisting('2.4');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('3.0');
    });

    test('does not bump major on branch that merely contains "major" mid-word', async () => {
      process.env.GITHUB_HEAD_REF = 'fix/fix-major-bug';
      mockExisting('0.3');
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const spec = JSON.parse(call(2).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.version).toBe('0.4');
    });
  });

  describe('validation', () => {
    test('throws when url is missing from agent.yaml', async () => {
      const yamlNoUrl = `displayName: Test\ndescription: No URL here\n`;
      await expect(registerAgent('my-agent', yamlNoUrl, false))
        .rejects.toThrow("missing required field: url");
    });

    test('throws when agent.yaml is empty/invalid YAML', async () => {
      await expect(registerAgent('my-agent', '', false))
        .rejects.toThrow("missing required field: url");
    });
  });

  describe('dry-run', () => {
    test('prints create message for new agent', async () => {
      mockNew();

      await registerAgent('my-agent', AGENT_YAML, true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would create at 0.1 agent: my-agent');
      expect(execGcloud).toHaveBeenCalledTimes(1);
    });

    test('prints update message with next version for existing agent', async () => {
      mockExisting('0.2');

      await registerAgent('my-agent', AGENT_YAML, true);

      expect(core.info).toHaveBeenCalledWith('[dry-run] Would update to 0.3 agent: my-agent');
      expect(execGcloud).toHaveBeenCalledTimes(2);
    });
  });

  describe('flags', () => {
    test('passes location, project, display-name, description, spec-type', async () => {
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML, false);

      const args = call(1);
      expect(args).toContain('--location=europe-west1');
      expect(args).toContain('--project=extenda');
      expect(args).toContain('--display-name=Test Agent');
      expect(args).toContain('--description=A test agent');
      expect(args).toContain('--agent-spec-type=a2a-agent-card');
    });

    test('uses agentId as displayName when omitted from YAML', async () => {
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', AGENT_YAML_MINIMAL, false);

      expect(call(1)).toContain('--display-name=my-agent');
    });

    test('defaults protocolBinding to a2a', async () => {
      const yaml = `url: https://a.example.com\ninterfaces:\n  - url: https://a.example.com/a2a\n`;
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', yaml, false);

      expect(call(1)).toContain('--interfaces=protocolBinding=a2a,url=https://a.example.com/a2a');
    });

    test('normalises plain-string skill to object with defaults', async () => {
      const yaml = `url: https://a.example.com\nskills:\n  - plain-skill\n`;
      mockNew();
      execGcloud.mockResolvedValueOnce('');

      await registerAgent('my-agent', yaml, false);

      const spec = JSON.parse(call(1).find((a) => a.startsWith('--agent-spec-content=')).slice(21));
      expect(spec.skills[0]).toMatchObject({ id: 'plain-skill', name: 'plain-skill', tags: [], examples: [] });
    });
  });
});
