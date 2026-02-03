jest.mock('../src/kubectl');
jest.mock('../src/rollback');
jest.mock('@actions/exec');

import * as exec from '@actions/exec';

import deploy from '../src/deploy.js';
import kubectl from '../src/kubectl.js';

describe('deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can deploy and rollout a manifest', async () => {
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    await deploy({
      file: 'manifest.yaml',
      namespace: 'namespace',
      tenantName: 'tenant',
    });
    expect(kubectl.exec).toHaveBeenNthCalledWith(1, [
      'apply',
      '-f',
      'manifest.yaml',
    ]);
    expect(kubectl.exec).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        'rollout',
        'tenant-txengine-service',
        '--namespace=namespace',
      ]),
    );
  });

  test('It can use a specified timeout', async () => {
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    await deploy({
      file: 'manifest.yaml',
      namespace: 'namespace',
      tenantName: 'tenant',
    });
    expect(kubectl.exec).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining(['rollout', '--timeout=300s']),
    );
  });

  test('It can get latest revision', async () => {
    const revisionList = `REVISION
2
3
4
`;
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    exec.exec.mockResolvedValueOnce(revisionList);
    exec.exec.mockResolvedValueOnce(0);

    await deploy({
      file: 'manifest.yaml',
      namespace: 'namespace',
      tenantName: 'tenant',
    });
    expect(kubectl.exec).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining(['rollout', '--timeout=300s']),
    );
  });

  test('It can handle rollback', async () => {
    const revisionList = `REVISION
2
3
4

`;
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockRejectedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    exec.exec.mockImplementationOnce((cmd, args, opts) =>
      opts.listeners.stdout(revisionList),
    );
    exec.exec.mockResolvedValueOnce(2);

    await expect(
      deploy({
        file: 'manifest.yaml',
        namespace: 'namespace',
        tenantName: 'tenant',
      }),
    ).rejects.toEqual(new Error('Deployment failed, Rollback was initiated!'));
    expect(kubectl.exec).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining(['rollout', '--timeout=300s']),
    );
    expect(kubectl.exec).toHaveBeenNthCalledWith(
      3,
      expect.arrayContaining(['rollout', '--to-revision=4']),
    );
  });
});
