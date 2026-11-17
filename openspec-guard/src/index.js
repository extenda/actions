import { execFileSync } from 'node:child_process';
import path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import * as io from '@actions/io';

import { runGuard } from './guard.js';

const ARCHIVE_PREFIX = 'chore/archive-';
const OPENSPEC_BIN = 'node_modules/@fission-ai/openspec/bin/openspec.js';

// The live draft state of the pull request. The event payload is replayed unchanged by a workflow re-run, so
// it can be stale.
const readDraft = async () => {
  const input = core.getInput('draft');
  if (input) {
    return input === 'true';
  }
  const number = github.context.payload.pull_request?.number;
  const token = core.getInput('github-token');
  if (!number || !token) {
    return false;
  }
  const { owner, repo } = github.context.repo;
  const { data } = await github.getOctokit(token).rest.pulls.get({
    owner,
    repo,
    pull_number: number,
  });
  return data.draft === true;
};

// The OpenSpec CLI and its transitive dependencies come from the committed openspec-cli/package-lock.json of
// this action (npm ci fails when it and package.json disagree); --ignore-scripts skips install scripts.
// It runs with the node of this action, which satisfies OpenSpec's node >= 22.12.
const installOpenSpec = async () => {
  const dir = path.join(
    process.env.GITHUB_ACTION_PATH ?? process.cwd(),
    'openspec-cli',
  );
  core.info(`Installing the pinned OpenSpec CLI from ${dir}`);
  execFileSync(
    await io.which('npm', true),
    ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', dir],
    {
      stdio: 'inherit',
    },
  );
  return [process.execPath, path.join(dir, OPENSPEC_BIN)];
};

const gitBranch = (gitBin) =>
  execFileSync(gitBin, ['branch', '--show-current'], {
    encoding: 'utf8',
  }).trim();

const action = async () => {
  const cwd = process.cwd();
  const gitBin = await io.which('git', true);
  const baseInput = core.getInput('base-ref');
  const baseBranch = process.env.GITHUB_BASE_REF;
  const base = baseInput || (baseBranch ? `origin/${baseBranch}` : '');
  if (!base) {
    throw new Error(
      'No base-ref input and no pull request base branch (GITHUB_BASE_REF) to compare with.',
    );
  }
  const branch =
    core.getInput('head-ref') ||
    process.env.GITHUB_HEAD_REF ||
    gitBranch(gitBin);

  const commandInput = core.getInput('openspec-command').trim();
  let openspecCommand = [];
  if (commandInput) {
    openspecCommand = commandInput.split(/\s+/);
  } else if (branch.startsWith(ARCHIVE_PREFIX)) {
    openspecCommand = await installOpenSpec();
  }

  const maxTasksInput = core.getInput('max-tasks');
  if (maxTasksInput && !/^[1-9]\d*$/.test(maxTasksInput)) {
    throw new Error(
      `max-tasks must be a positive integer, got '${maxTasksInput}'.`,
    );
  }
  const { failures, skipped } = runGuard({
    cwd,
    base,
    branch,
    draft: await readDraft(),
    openspecCommand,
    storeId: core.getInput('store-id'),
    clanPrefix: core.getInput('clan-prefix'),
    servicesFile: core.getInput('services-file') || undefined,
    servicesHeading: core.getInput('services-heading') || undefined,
    maxTasks: maxTasksInput ? Number(maxTasksInput) : undefined,
    gitBin,
  });

  if (skipped) {
    core.info('Nothing under openspec/ or .openspec-store/ changed.');
    return;
  }
  failures.forEach(({ file, message }) => core.error(message, { file }));
  if (failures.length > 0) {
    core.setFailed(`openspec-guard found ${failures.length} problem(s).`);
  } else {
    core.info('openspec-guard passed.');
  }
};

export default action;
