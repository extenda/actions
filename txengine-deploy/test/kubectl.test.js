import { afterEach, describe, expect, test, vi } from 'vitest';
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('@actions/exec');
const mockClusterInfo = vi.fn();
vi.mock('../../cloud-run/src/cluster-info', () => ({
  getClusterInfo: mockClusterInfo,
}));
vi.mock('../../cloud-run/src/kubectl-auth.js');

import * as exec from '@actions/exec';

import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth.js';
import { setupGcloud } from '../../setup-gcloud/src/index.js';
import kubectl from '../src/kubectl.js';

describe('kubectl', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It can configure kubectl', async () => {
    setupGcloud.mockResolvedValueOnce('test-project');
    mockClusterInfo.mockResolvedValueOnce({ projectId: 'test-project' });
    authenticateKubeCtl.mockResolvedValueOnce({ projectId: 'test-project' });
    const projectId = await kubectl.configure('service-key');
    expect(projectId).toEqual('test-project');
    expect(setupGcloud).toHaveBeenCalled();
  });

  test('It can execute kubectl', async () => {
    exec.exec.mockResolvedValueOnce(0);
    await kubectl.exec(['apply', '-f', 'test.yaml']);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'test.yaml',
    ]);
  });
});
