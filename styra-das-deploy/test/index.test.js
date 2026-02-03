import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');

import * as core from '@actions/core';

import action from '../src/index.js';

describe('run push policy', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can run the action', async () => {
    await action();
    expect(core.warning).toHaveBeenCalledWith(expect.any(String));
  });
});
