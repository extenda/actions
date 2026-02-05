import * as exec from '@actions/exec';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { loadTool } from '../../utils/src/index.js';
import kustomize from '../src/kustomize.js';

vi.mock('@actions/exec');
vi.mock('../../utils/src/index.js', () => ({
  loadTool: vi.fn(),
}));

describe('Run Kustomize', () => {
  beforeEach(() => {
    process.env.GITHUB_WORKSPACE = 'extenda/test-repo';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can run Kustomize with args', async () => {
    exec.exec.mockResolvedValueOnce(0);
    const tool = 'kustomize';
    loadTool.mockResolvedValueOnce(tool);

    const args = ['edit', 'set'];
    await kustomize(args);

    expect(exec.exec).toHaveBeenCalledWith(
      tool,
      args,
      expect.objectContaining({ cwd: 'kustomize' }),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
