jest.mock('../../setup-gcloud');
jest.mock('@actions/exec');
const mockClusterInfo = jest.fn();
jest.mock('../../cloud-run/src/cluster-info', () => ({
  getClusterInfo: mockClusterInfo,
}));
jest.mock('../../cloud-run/src/kubectl-auth');

import exec from '@actions/exec';

import authenticateKubeCtl from '../../cloud-run/src/kubectl-auth';
import { setupGcloud } from '../../setup-gcloud';
import kubectl from '../src/kubectl';

describe('kubectl', () => {
  afterEach(() => {
    jest.resetAllMocks();
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
