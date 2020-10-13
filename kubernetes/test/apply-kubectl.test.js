const exec = require('@actions/exec');
const mockFs = require('mock-fs');
const applyKubectl = require('../src/apply-kubectl');

jest.mock('@actions/exec');

describe('Kubectl applies manifest', () => {
  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It will apply manifest and call rollout status', async () => {
    const deployment = 'deployment';
    await applyKubectl(deployment);

    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      [
        'apply',
        '-k',
        './kustomize',
      ],
    );
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      [
        'rollout',
        'status',
        '-k',
        './kustomize',
        `--namespace=${deployment}`,
      ],
    );
  });

  test('It will not apply manifest and skip rollout status when running with dry-run', async () => {
    const dryRun = true;
    const deployment = 'deployment';
    await applyKubectl(deployment, dryRun);

    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      [
        'apply',
        '-k',
        './kustomize',
        '--dry-run=client',
      ],
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
