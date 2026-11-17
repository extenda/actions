import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('@actions/io');
vi.mock('../src/guard.js');
vi.mock('node:child_process');

const mockGet = vi.fn();
vi.mock('@actions/github', () => ({
  context: {
    payload: { pull_request: { number: 7 } },
    repo: { owner: 'extenda', repo: 'store' },
  },
  getOctokit: () => ({ rest: { pulls: { get: mockGet } } }),
}));

import { execFileSync } from 'node:child_process';
import path from 'node:path';

import * as core from '@actions/core';
import * as io from '@actions/io';

import { runGuard } from '../src/guard.js';
import action from '../src/index.js';

const orgEnv = process.env;

const inputs = (values) =>
  core.getInput.mockImplementation((name) => values[name] ?? '');

describe('openspec-guard action', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_BASE_REF: 'master',
      GITHUB_HEAD_REF: 'feat/x',
    };
    delete process.env.GITHUB_ACTION_PATH;
    io.which.mockImplementation(async (tool) => `/usr/bin/${tool}`);
    execFileSync.mockImplementation((bin, args) =>
      args[0] === 'rev-parse' ? '/work/store\n' : '',
    );
    mockGet.mockResolvedValue({ data: { draft: true } });
    runGuard.mockReturnValue({ failures: [], skipped: false });
  });
  afterEach(() => {
    vi.resetAllMocks();
    process.env = orgEnv;
  });

  test('passes the inputs and the live draft state to the guard', async () => {
    inputs({
      'github-token': 'tok',
      'clan-prefix': 'cardpayment-',
      'max-tasks': '4',
      'store-id': 'hiiconnect',
    });
    await action();
    expect(mockGet).toHaveBeenCalledWith({
      owner: 'extenda',
      repo: 'store',
      pull_number: 7,
    });
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        base: 'origin/master',
        branch: 'feat/x',
        draft: true,
        clanPrefix: 'cardpayment-',
        storeId: 'hiiconnect',
        maxTasks: 4,
        servicesFile: undefined,
        gitBin: '/usr/bin/git',
        openspecCommand: [],
      }),
    );
    expect(execFileSync).not.toHaveBeenCalledWith(
      '/usr/bin/npm',
      expect.anything(),
      expect.anything(),
    );
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('runs from the git toplevel, also with a checkout path', async () => {
    inputs({ draft: 'false' });
    await action();
    expect(execFileSync).toHaveBeenCalledWith(
      '/usr/bin/git',
      ['rev-parse', '--show-toplevel'],
      expect.anything(),
    );
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: '/work/store' }),
    );
  });

  test('the draft input wins over the API', async () => {
    inputs({ draft: 'false', 'github-token': 'tok' });
    await action();
    expect(mockGet).not.toHaveBeenCalled();
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false }),
    );
  });

  test('explicit refs win over the event', async () => {
    inputs({ 'base-ref': 'origin/main', 'head-ref': 'feat/y', draft: 'false' });
    await action();
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({ base: 'origin/main', branch: 'feat/y' }),
    );
  });

  test('reports each failure with its file and fails the action', async () => {
    inputs({ draft: 'false' });
    runGuard.mockReturnValue({
      failures: [
        { file: 'a.md', message: 'one' },
        { file: 'b.md', message: 'two' },
      ],
      skipped: false,
    });
    await action();
    expect(core.error).toHaveBeenCalledWith('one', { file: 'a.md' });
    expect(core.error).toHaveBeenCalledWith('two', { file: 'b.md' });
    expect(core.setFailed).toHaveBeenCalledWith(
      'openspec-guard found 2 problem(s).',
    );
  });

  test('a skipped run passes', async () => {
    inputs({ draft: 'false' });
    runGuard.mockReturnValue({ failures: [], skipped: true });
    await action();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  test('installs the locked OpenSpec CLI only on archive branches', async () => {
    process.env.GITHUB_HEAD_REF = 'chore/archive-hicc-1-old';
    inputs({ draft: 'false' });
    await action();
    // The runner sets no GITHUB_ACTION_PATH for a node action: the folder is found from the bundle location.
    expect(process.env.GITHUB_ACTION_PATH).toBeUndefined();
    const cliDir = path.resolve(__dirname, '..', 'openspec-cli');
    expect(execFileSync).toHaveBeenCalledWith(
      '/usr/bin/npm',
      ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', cliDir],
      expect.anything(),
    );
    const { openspecCommand } = runGuard.mock.calls[0][0];
    expect(openspecCommand[0]).toBe(process.execPath);
    expect(openspecCommand[1]).toBe(
      path.join(cliDir, 'node_modules/@fission-ai/openspec/bin/openspec.js'),
    );
  });

  test('an explicit openspec-command is used as is', async () => {
    process.env.GITHUB_HEAD_REF = 'chore/archive-hicc-1-old';
    inputs({
      draft: 'false',
      'openspec-command': 'npx @fission-ai/openspec@2.0.0',
    });
    await action();
    expect(execFileSync).not.toHaveBeenCalledWith(
      '/usr/bin/npm',
      expect.anything(),
      expect.anything(),
    );
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        openspecCommand: ['npx', '@fission-ai/openspec@2.0.0'],
      }),
    );
  });

  test.each(['words', '0', '-1', '1.5', '4x'])(
    'max-tasks %j fails the action',
    async (value) => {
      inputs({ draft: 'false', 'max-tasks': value });
      await expect(action()).rejects.toThrow(
        /max-tasks must be a positive integer/,
      );
      expect(runGuard).not.toHaveBeenCalled();
    },
  );

  test('needs a base', async () => {
    delete process.env.GITHUB_BASE_REF;
    inputs({});
    await expect(action()).rejects.toThrow(/base-ref/);
  });
});

describe('draft without a pull request', () => {
  test('is false', async () => {
    process.env = {
      ...orgEnv,
      GITHUB_BASE_REF: 'master',
      GITHUB_HEAD_REF: 'x',
    };
    inputs({});
    execFileSync.mockReturnValue('/work/store\n');
    runGuard.mockReturnValue({ failures: [], skipped: true });
    mockGet.mockRejectedValue(new Error('no token'));
    await action();
    expect(runGuard).toHaveBeenCalledWith(
      expect.objectContaining({ draft: false }),
    );
    process.env = orgEnv;
  });
});
