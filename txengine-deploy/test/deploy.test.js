jest.mock('../src/kubectl');
jest.mock('../src/rollback');
jest.mock('@actions/exec');

const exec = require('@actions/exec');
const kubectl = require('../src/kubectl');
const deploy = require('../src/deploy');

describe('deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can deploy and rollout a manifest', async () => {
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(1, ['apply', '-f', 'manifest.yaml']);
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', 'tenant-txengine-service', '--namespace=namespace']));
  });

  test('It can use a specified timeout', async () => {
    kubectl.exec.mockResolvedValueOnce(0);
    kubectl.exec.mockResolvedValueOnce(0);

    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', '--timeout=120s']));
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

    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', '--timeout=120s']));
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

    exec.exec.mockImplementationOnce((
      cmd, args, opts,
    ) => opts.listeners.stdout((revisionList)));
    exec.exec.mockResolvedValueOnce(2);

    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', '--timeout=120s']));
    expect(kubectl.exec).toHaveBeenNthCalledWith(3,
      expect.arrayContaining(['rollout', '--to-revision=4']));
  });
});
