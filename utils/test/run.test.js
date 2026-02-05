import * as core from '@actions/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import run from '../src/run.js';

vi.mock('@actions/core');

describe('Action Runner Wrapper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = {
      ...originalEnv,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('skips execution when running in test mode (default)', async () => {
    // process.env.VITEST is true by default here
    const mockAction = vi.fn();

    await run(mockAction);

    expect(mockAction).not.toHaveBeenCalled();
  });

  it('executes the action when NOT in test mode', async () => {
    delete process.env.VITEST;
    delete process.env.JEST_WORKER_ID;

    const mockAction = vi.fn().mockResolvedValue('success');

    await run(mockAction);

    expect(mockAction).toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('executes the action once', async () => {
    delete process.env.VITEST;
    delete process.env.JEST_WORKER_ID;

    const mockAction = vi.fn().mockResolvedValue('success');

    await run(mockAction);
    await run(mockAction);

    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('catches exceptions and sets failure status', async () => {
    delete process.env.VITEST;
    delete process.env.JEST_WORKER_ID;

    const errorMessage = 'Something went wrong!';
    const failingAction = vi.fn().mockRejectedValue(new Error(errorMessage));

    await run(failingAction);

    expect(failingAction).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
  });
});
