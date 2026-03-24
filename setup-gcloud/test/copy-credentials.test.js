import fs from 'node:fs';
import path from 'node:path';

import * as io from '@actions/io';
import mockFs from 'mock-fs';
import { v4 as uuid } from 'uuid';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import copyCredentials from '../src/copy-credentials.js';

vi.mock('@actions/io', () => ({
  cp: vi.fn(async (source, dest) => {
    const content = fs.readFileSync(source);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'fixed-uuid'),
}));

describe('copy-credentials', () => {
  let orgEnv;

  beforeEach(() => {
    orgEnv = process.env;
    process.env = { ...orgEnv };
  });

  afterEach(() => {
    process.env = orgEnv;
    mockFs.restore();
    vi.clearAllMocks();
  });

  test('returns original path when RUNNER_TEMP is not set', async () => {
    delete process.env.RUNNER_TEMP;
    mockFs({
      '/tmp': {
        'key.json': '{"foo":"bar"}',
      },
    });

    const result = await copyCredentials('/tmp/key.json');

    expect(result).toBe('/tmp/key.json');
    expect(uuid).not.toHaveBeenCalled();
    expect(io.cp).not.toHaveBeenCalled();
  });

  test('copies key file to RUNNER_TEMP with deterministic uuid path', async () => {
    process.env.RUNNER_TEMP = '/runner/temp';
    mockFs({
      '/tmp': {
        'key.json': '{"foo":"bar"}',
      },
      '/runner/temp': {},
    });

    const result = await copyCredentials('/tmp/key.json');

    expect(result).toBe(path.join('/runner/temp', 'fixed-uuid'));
    expect(uuid).toHaveBeenCalledTimes(1);
    expect(io.cp).toHaveBeenCalledWith('/tmp/key.json', result);
    expect(fs.readFileSync(result, 'utf8')).toBe('{"foo":"bar"}');
  });

  test('throws when source key file does not exist', async () => {
    process.env.RUNNER_TEMP = '/runner/temp';
    mockFs({
      '/runner/temp': {},
    });

    await expect(copyCredentials('/tmp/missing.json')).rejects.toThrow();
    expect(io.cp).toHaveBeenCalledWith(
      '/tmp/missing.json',
      path.join('/runner/temp', 'fixed-uuid'),
    );
  });
});
