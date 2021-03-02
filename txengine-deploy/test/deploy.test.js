jest.mock('../src/kubectl');
const kubectl = require('../src/kubectl');

const deploy = require('../src/deploy');

describe('deploy', () => {
  test('It can deploy a manifest', async () => {
    await deploy({ file: 'manifest.yaml', namespace: 'namespace' });
    expect(kubectl.exec).toHaveBeenNthCalledWith(1, ['apply', '-f', 'manifest.yaml']);
    expect(kubectl.exec).toHaveBeenNthCalledWith(2,
      expect.arrayContaining(['rollout', '--namespace=namespace']));
  });
});
