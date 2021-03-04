jest.mock('@actions/core');
jest.mock('../src/deploy');
jest.mock('../src/kubectl');
jest.mock('../src/manifests');
jest.mock('../src/env-vars');

const core = require('@actions/core');
const kubectl = require('../src/kubectl');
const createManifests = require('../src/manifests');
const createEnvironment = require('../src/env-vars');
const deploy = require('../src/deploy');

const action = require('../src/index');

describe('txengine-deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It can deploy txengine without optional environment', async () => {
    core.getInput.mockReturnValueOnce('deploy-account')
      .mockReturnValueOnce('secret-account')
      .mockReturnValueOnce('image')
      .mockReturnValueOnce('tenant')
      .mockReturnValueOnce('SE');

    createEnvironment.mockReturnValueOnce({ NAMESPACE: 'test' });

    kubectl.configure.mockResolvedValueOnce({ projectId: 'test-project' });
    createManifests.mockResolvedValueOnce(({
      file: 'file.yaml',
      content: 'test',
      namespace: 'test-namespace',
    }));

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(kubectl.configure).toHaveBeenCalledWith('deploy-account');
    expect(createManifests).toHaveBeenCalledTimes(1);
    expect(deploy).toHaveBeenCalledTimes(1);
  });

  test('It can replace secret manager wildcards', async () => {
    core.getInput.mockReturnValueOnce('deploy-account')
      .mockReturnValueOnce('secret-account')
      .mockReturnValueOnce('image')
      .mockReturnValueOnce('tenant')
      .mockReturnValueOnce('SE')
      .mockReturnValueOnce('KEY: value\nSECRET: sm://*/my-secret\n');

    createEnvironment.mockReturnValueOnce({ NAMESPACE: 'test' });

    kubectl.configure.mockResolvedValueOnce({ projectId: 'test-project' });
    createManifests.mockResolvedValueOnce(({
      file: 'file.yaml',
      content: 'test',
      namespace: 'test-namespace',
    }));

    await action();

    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(kubectl.configure).toHaveBeenCalledWith('deploy-account');
    expect(createManifests).toHaveBeenCalledWith(
      'secret-account',
      { NAMESPACE: 'test' },
      { KEY: 'value', SECRET: 'sm://test-project/my-secret' },
    );

    expect(deploy).toHaveBeenCalledTimes(1);
  });
});
