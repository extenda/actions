import exec from '@actions/exec';
import mockFs from 'mock-fs';

import applyKubectl from '../src/apply-kubectl';

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
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    await applyKubectl(deployment, deploymentType, dryRun);

    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-k',
      './kustomize',
    ]);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'rollout',
      'status',
      deploymentType,
      deployment,
      `--namespace=${deployment}`,
      '--watch=true',
    ]);
  });

  test('It will not apply manifest and skip rollout status when running with dry-run', async () => {
    const dryRun = true;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    await applyKubectl(deployment, deploymentType, dryRun);

    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-k',
      './kustomize',
      '--dry-run=client',
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
