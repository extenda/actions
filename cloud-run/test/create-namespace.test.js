jest.mock('@actions/exec');
const mockFs = require('mock-fs');

const exec = require('@actions/exec');
const createNamespace = require('../src/create-namespace');

const clusterInfo = {
  cluster: 'k8-cluster',
  clusterLocation: 'europe-west1',
  project: 'test-12345',
};

const mockOutput = (data, opts) => {
  opts.listeners.stderr(Buffer.from(`${data}\n`, 'utf8'));
  return Promise.reject(new Error('exit code 1'));
};

const mockRegoFile = 'package istio.authz\ndefault allow = true';

describe('Create namespace', () => {
  beforeEach(() => {
    mockFs({
      'policy.rego': mockRegoFile,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    mockFs.restore();
  });

  test('It creates namespace if non exists', async () => {
    exec.exec.mockResolvedValueOnce(0)
      .mockImplementationOnce((bin, args, opts) => mockOutput('Error from server (NotFound): namespaces "testns" not found', opts))
      .mockResolvedValue(0);
    await createNamespace('clan_project', true, clusterInfo, 'testns', 'policy.rego');

    expect(exec.exec).toHaveBeenCalledTimes(8);
    expect(exec.exec.mock.calls[1][1]).toEqual(['get', 'namespace', 'testns']);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'kubectl', ['create', 'namespace', 'testns']);
  });

  test('It fails on unknown error', async () => {
    exec.exec.mockResolvedValueOnce(0)
      .mockImplementationOnce((bin, args, opts) => mockOutput('Error from server (connection refused): could not establish connection', opts))
      .mockResolvedValue(0);
    await expect(createNamespace('clan_project', true, clusterInfo, 'testns', 'policy.rego')).rejects.toEqual(new Error('Could not get namespace information! reason: exit code 1'));
    expect(exec.exec).toHaveBeenCalledTimes(2);
    expect(exec.exec.mock.calls[1][1]).toEqual(['get', 'namespace', 'testns']);
  });

  test('It reuses namespace if exists', async () => {
    exec.exec.mockResolvedValue(0);

    await createNamespace('clan_project', true, clusterInfo, 'testns', 'policy.rego');
    expect(exec.exec).toHaveBeenCalledTimes(6);
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', ['create', 'namespace', 'testns']);
  });

  test('It enables Istio injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace('clan_project', true, clusterInfo, 'testns', 'policy.rego');
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
    await createNamespace('clan_project', false, clusterInfo, 'testns', 'policy.rego');
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'opa-istio-injection=disabled', '--overwrite=true'],
    );
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      ['label', 'namespace', 'testns', 'istio-injection=disabled', '--overwrite=true'],
    );
  });

  test('It disables opa injection without regoFile', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace('clan_project', true, clusterInfo, 'testns', '');
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
