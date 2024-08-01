const mockFs = require('mock-fs');
const exec = require('@actions/exec');

jest.mock('@actions/exec');

const checkNamespaceExists = require('../src/check-namespace-exists');

const mockOutput = (data, opts) => {
  opts.listeners.stderr(Buffer.from(`${data}\n`, 'utf8'));
  return Promise.reject(new Error('exit code 1'));
};

describe('Check the namespace exists', () => {
  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It throws error if namespace does not exist', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          'Error from server (NotFound): namespaces "deploymentNamespace" not found',
          opts,
        ),
      )
      .mockResolvedValue(0);
    await expect(checkNamespaceExists('deploymentNamespace')).rejects.toEqual(
      new Error(`Namespace not found, please make sure your service is setup correctly!
Visit https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services for more information`),
    );

    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'get',
      'namespace',
      'deploymentNamespace',
    ]);
  });

  test('It fails on unknown error', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          'Error from server (connection refused): could not establish connection',
          opts,
        ),
      )
      .mockResolvedValue(0);
    await expect(checkNamespaceExists('deploymentNamespace')).rejects.toEqual(
      new Error('Could not get namespace information! reason: exit code 1'),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual([
      'get',
      'namespace',
      'deploymentNamespace',
    ]);
  });

  test('It does not create namespace', async () => {
    exec.exec.mockResolvedValue(0);

    await checkNamespaceExists('deploymentNamespace');
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', [
      'create',
      'namespace',
      'deploymentNamespace',
    ]);
  });
});
