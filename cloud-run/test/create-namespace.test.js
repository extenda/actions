jest.mock('@actions/exec');
const mockFs = require('mock-fs');

const exec = require('@actions/exec');
const createNamespace = require('../src/create-namespace');

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
    mockFs.restore();
  });

  test('It throws error if namespace does not exist', async () => {
    exec.exec
      .mockImplementationOnce((bin, args, opts) =>
        mockOutput(
          'Error from server (NotFound): namespaces "testns" not found',
          opts,
        ),
      )
      .mockResolvedValue(0);
    await expect(
      createNamespace('clan_project', true, 'testns'),
    ).rejects.toEqual(
      new Error(`Namespace not found, please make sure your service is setup correctly!
Visit https://github.com/extenda/tf-infra-gcp/blob/master/docs/project-config.md#services for more information`),
    );

    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual(['get', 'namespace', 'testns']);
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
    await expect(
      createNamespace('clan_project', true, 'testns'),
    ).rejects.toEqual(
      new Error('Could not get namespace information! reason: exit code 1'),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec.mock.calls[0][1]).toEqual(['get', 'namespace', 'testns']);
  });

  test('It reuses namespace if exists', async () => {
    exec.exec.mockResolvedValue(0);

    await createNamespace('clan_project', true, 'testns');
    expect(exec.exec).toHaveBeenCalledTimes(3);
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', [
      'create',
      'namespace',
      'testns',
    ]);
  });

  test('It enables Istio injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace('clan_project', true, 'testns');
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'label',
      'namespace',
      'testns',
      'opa-istio-injection=enabled',
      '--overwrite=true',
    ]);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'label',
      'namespace',
      'testns',
      'istio-injection=enabled',
      '--overwrite=true',
    ]);
  });

  test('It disables Istio injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace('clan_project', false, 'testns');
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'label',
      'namespace',
      'testns',
      'opa-istio-injection=disabled',
      '--overwrite=true',
    ]);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'label',
      'namespace',
      'testns',
      'istio-injection=disabled',
      '--overwrite=true',
    ]);
  });

  test('It skips label injection', async () => {
    exec.exec.mockResolvedValue(0);
    await createNamespace('clan_project', 'skip', 'testns');
    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', [
      'label',
      'namespace',
      'testns',
      expect.stringContaining('opa-istio-injection'),
      '--overwrite=true',
    ]);
  });
});
