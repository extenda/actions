import fs from 'node:fs';
import path from 'node:path';

import * as core from '@actions/core';
import mockFs from 'mock-fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import createJobScopedCredential, {
  resetTrackedCredentials,
} from '../src/create-job-scoped-credential.js';

vi.mock('@actions/core');
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid'),
}));

describe('create-job-scoped-credential', () => {
  let orgEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    orgEnv = process.env;
    process.env = {
      ...orgEnv,
      RUNNER_TEMP: '/runner/temp',
      GITHUB_RUN_ID: '12345',
      GITHUB_RUN_ATTEMPT: '1',
    };

    mockFs({
      '/runner/temp': {},
    });
  });

  afterEach(() => {
    process.env = orgEnv;
    mockFs.restore();
    vi.clearAllMocks();
    resetTrackedCredentials();
  });

  test('creates a job-scoped credential file with base64 encoding', () => {
    const credentialData = Buffer.from(
      JSON.stringify({ foo: 'bar' }),
      'utf8',
    ).toString('base64');

    const filePath = createJobScopedCredential(credentialData);

    expect(filePath).toContain('setup-gcloud-12345-1');
    expect(filePath).toContain('credential-fixed-uuid.json');
    expect(filePath).toContain('/runner/temp');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.readFileSync(filePath, 'utf8')).toBe(
      JSON.stringify({ foo: 'bar' }),
    );
    expect(core.setSecret).toHaveBeenCalledWith(filePath);
  });

  test('creates a job-scoped credential file with utf8 encoding', () => {
    const tokenData = 'oidc-token-raw-string';

    const filePath = createJobScopedCredential(tokenData, { encoding: 'utf8' });

    expect(filePath).toContain('setup-gcloud-12345-1');
    expect(fs.readFileSync(filePath, 'utf8')).toBe(tokenData);
    expect(core.setSecret).toHaveBeenCalledWith(filePath);
  });

  test('persists credentials to state immediately on creation', () => {
    const filePath = createJobScopedCredential('base64data', {
      encoding: 'base64',
    });

    expect(core.saveState).toHaveBeenCalledWith(
      'gcloud-credential-files',
      JSON.stringify([filePath]),
    );
  });

  test('persists accumulated files on each credential creation', () => {
    const filePath1 = createJobScopedCredential('data1', {
      encoding: 'base64',
    });
    const filePath2 = createJobScopedCredential('data2', {
      encoding: 'utf8',
    });

    // Each call should have saved the accumulated list
    expect(core.saveState).toHaveBeenNthCalledWith(
      1,
      'gcloud-credential-files',
      expect.stringContaining(filePath1),
    );
    expect(core.saveState).toHaveBeenNthCalledWith(
      2,
      'gcloud-credential-files',
      expect.stringContaining(filePath1),
    );
    expect(core.saveState).toHaveBeenNthCalledWith(
      2,
      'gcloud-credential-files',
      expect.stringContaining(filePath2),
    );
  });

  test('uses custom suffix when provided', () => {
    const filePath = createJobScopedCredential('data', {
      encoding: 'utf8',
      suffix: '.txt',
    });

    expect(filePath).toContain('.txt');
  });

  test('creates job-scoped directory if it does not exist', () => {
    const filePath = createJobScopedCredential('data', {
      encoding: 'utf8',
    });

    const jobDir = path.dirname(filePath);
    expect(fs.existsSync(jobDir)).toBe(true);
  });

  test('throws when RUNNER_TEMP is not set', () => {
    delete process.env.RUNNER_TEMP;

    expect(() => {
      createJobScopedCredential('data', { encoding: 'utf8' });
    }).toThrow(
      'RUNNER_TEMP and GITHUB_RUN_ID environment variables are required',
    );
  });

  test('throws when GITHUB_RUN_ID is not set', () => {
    delete process.env.GITHUB_RUN_ID;

    expect(() => {
      createJobScopedCredential('data', { encoding: 'utf8' });
    }).toThrow(
      'RUNNER_TEMP and GITHUB_RUN_ID environment variables are required',
    );
  });

  test('creates file with restrictive permissions (0o600)', () => {
    const filePath = createJobScopedCredential('data', {
      encoding: 'utf8',
    });

    const stats = fs.statSync(filePath);
    expect(stats.mode & parseInt('777', 8)).toBe(parseInt('600', 8));
  });

  test('uses GITHUB_RUN_ATTEMPT in path, defaulting to "1"', () => {
    delete process.env.GITHUB_RUN_ATTEMPT;

    const filePath = createJobScopedCredential('data', {
      encoding: 'utf8',
    });

    expect(filePath).toContain('setup-gcloud-12345-1');
  });
});
