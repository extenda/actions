jest.mock('../src/kubectl');
const kubectl = require('../src/kubectl');

const deploy = require('../src/deploy');

describe('deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can deploy a manifest', async () => {
    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(1, ['apply', '-f', 'manifest.yaml']);
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', 'tenant-txengine-service', '--namespace=namespace']));
  });

  test('It can use a specified timeout', async () => {
    await deploy({ file: 'manifest.yaml', namespace: 'namespace', tenantName: 'tenant' }, 300);
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', '--timeout=300s']));
  })
});
