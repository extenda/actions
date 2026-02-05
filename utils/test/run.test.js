import * as core from '@actions/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import run from '../src/run.js';

vi.mock('@actions/core');

describe('Action Runner Wrapper', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('catches exceptions and sets failure status', async () => {
    const errorMessage = 'Something went wrong!';
    const failingAction = vi.fn().mockRejectedValue(new Error(errorMessage));

    await run(failingAction);

    expect(failingAction).toHaveBeenCalled();
    expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
  });
});
