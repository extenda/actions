import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/exec');
import * as exec from '@actions/exec';

import projectLabels from '../src/project-labels.js';

describe('Get projects labels', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Labels added', async () => {
    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      opts.listeners.stdout("--- cc: '640'");
      return Promise.resolve(0);
    });

    await expect(projectLabels('test-staging-323')).resolves.toEqual('640');
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
