jest.mock('@actions/core');
jest.mock('../src/deploy');
jest.mock('../src/kubectl');
jest.mock('../src/manifests');

const core = require('@actions/core');
const kubectl = require('../src/kubectl');
const createManifests = require('../src/manifests');
const deploy = require('../src/deploy');

const action = require('../src/index');

describe('txengine-deploy', () => {
  test('It can deploy txengine', async () => {
    core.getInput.mockReturnValueOnce('deploy-account')
      .mockReturnValueOnce('secret-account')
      .mockReturnValueOnce('image')
      .mockReturnValueOnce('tenant')
      .mockReturnValueOnce('SE');

    kubectl.configure.mockResolvedValueOnce('test-project');
    createManifests.mockResolvedValueOnce(({
      file: 'file.yaml',
      content: 'test',
      namespace: 'test-namespace',
    }));

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(5);
    expect(kubectl.configure).toHaveBeenCalledWith('deploy-account');
    expect(createManifests).toHaveBeenCalledTimes(1);
    expect(deploy).toHaveBeenCalledTimes(1);
  });
});
