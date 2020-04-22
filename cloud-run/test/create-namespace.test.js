jest.mock('@actions/exec');

const exec = require('@actions/exec');
const createNamespace = require('../src/create-namespace');

const clusterInfo = {
  cluster: 'k8-cluster',
  clusterLocation: 'europe-west1',
  project: 'test-12345',
};

const mockOutput = (data, opts) => {
  opts.listeners.stdout(Buffer.from(`${data}\n`, 'utf8'));
  return Promise.resolve(0);
};

describe('Create namespace', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('It creates namespace if non exists', async () => {
    exec.exec.mockResolvedValueOnce(0)
      .mockRejectedValueOnce(new Error ('(NotFound)'))
      .mockResolvedValue(0);
    await createNamespace(true, clusterInfo, 'testns');

    expect(exec.exec).toHaveBeenCalledTimes(5);
    expect(exec.exec.mock.calls[1][1]).toEqual(['get', 'namespace', 'testns']);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'kubectl', ['create', 'namespace', 'testns']);
  });

  test('It reuses namespace if exists', async () => {
    exec.exec.mockResolvedValue(0);

    await createNamespace(true, clusterInfo, 'testns');
    expect(exec.exec).toHaveBeenCalledTimes(4);
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', ['create', 'namespace', 'testns']);
  });

  test('It enables Istio injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace(true, clusterInfo, 'testns');
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'opa-istio-injection=enabled', '--overwrite=true'],
    );
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'istio-injection=enabled', '--overwrite=true'],
    );
  });

  test('It disables Istio injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace(false, clusterInfo, 'testns');
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'opa-istio-injection=disabled', '--overwrite=true'],
    );
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'istio-injection=disabled', '--overwrite=true'],
    );
  });
});
