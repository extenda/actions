const exec = require('@actions/exec');
const mockFs = require('mock-fs');
const applyAutoscale = require('../src/autoscale');

jest.mock('@actions/exec');

describe('Kubectl applies autoscaler', () => {
  beforeEach(() => {
    mockFs({});
  });

  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  test('It will remove autoscaler when configuration is not defined', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;

    exec.exec.mockImplementationOnce((cmd, args, opts) => {
      return Promise.resolve(0);
    });

    await applyAutoscale(deployment, deploymentType, undefined, permanentReplicas, dryRun);

    expect(exec.exec).toHaveBeenNthCalledWith(1, 'kubectl', ['get', 'hpa', deployment], expect.anything());
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'kubectl', ['delete', 'hpa', deployment]);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'kubectl', ['scale', deploymentType, deployment, `--replicas=${permanentReplicas}`]);
    expect(exec.exec).toHaveBeenCalledTimes(3);
  });

  test('It will skip removing autoscaler that not exists when configuration is not defined', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;

    exec.exec.mockImplementation((cmd, args, opts) => {
      opts.listeners.stderr(Buffer.from(`Error from server (NotFound): horizontalpodautoscalers.autoscaling ${deployment} not found`, 'utf8'));
      return Promise.reject(new Error('exit code 1'));
    });

    await applyAutoscale(deployment, deploymentType, undefined, permanentReplicas, dryRun);

    expect(exec.exec).toHaveBeenNthCalledWith(1, 'kubectl', ['get', 'hpa', deployment], expect.anything());
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will skip removing autoscaler when configuration provided', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;
    const autoscale = { minReplicas: 1, maxReplicas: 6 };

    await applyAutoscale(deployment, deploymentType, autoscale, permanentReplicas, dryRun);

    expect(exec.exec).not.toHaveBeenNthCalledWith(1, 'kubectl', ['get', 'hpa', deployment], expect.anything());
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will apply autoscale when configuration provided', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;
    const autoscale = { minReplicas: 1, maxReplicas: 6 };

    await applyAutoscale(deployment, deploymentType, autoscale, permanentReplicas, dryRun);

    expect(exec.exec).not.toHaveBeenCalledWith('kubectl', ['get', 'hpa', deployment], expect.anything());
    expect(exec.exec).toHaveBeenCalledWith('kubectl', ['apply', '-f', 'hpa.yml']);

    expect(exec.exec).toHaveBeenCalledTimes(1);
  });
});
