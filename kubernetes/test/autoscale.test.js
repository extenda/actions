import * as exec from '@actions/exec';
import fs from 'fs';
import mockFs from 'mock-fs';

import applyAutoscale from '../src/autoscale.js';

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

    exec.exec.mockImplementationOnce(() => Promise.resolve(0));

    await applyAutoscale(
      deployment,
      deploymentType,
      undefined,
      permanentReplicas,
      dryRun,
    );

    expect(exec.exec).toHaveBeenNthCalledWith(
      1,
      'kubectl',
      ['get', 'hpa', deployment, `--namespace=${deployment}`],
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenNthCalledWith(2, 'kubectl', [
      'delete',
      'hpa',
      deployment,
      `--namespace=${deployment}`,
    ]);
    expect(exec.exec).toHaveBeenNthCalledWith(3, 'kubectl', [
      'scale',
      deploymentType,
      deployment,
      `--namespace=${deployment}`,
      `--replicas=${permanentReplicas}`,
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(3);
  });

  test('It will skip removing autoscaler that not exists when configuration is not defined', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;

    exec.exec.mockImplementation((cmd, args, opts) => {
      opts.listeners.stderr(
        Buffer.from(
          `Error from server (NotFound): horizontalpodautoscalers.autoscaling ${deployment} not found`,
          'utf8',
        ),
      );
      return Promise.reject(new Error('exit code 1'));
    });

    await applyAutoscale(
      deployment,
      deploymentType,
      undefined,
      permanentReplicas,
      dryRun,
    );

    expect(exec.exec).toHaveBeenNthCalledWith(
      1,
      'kubectl',
      ['get', 'hpa', deployment, `--namespace=${deployment}`],
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will skip removing autoscaler when configuration provided', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;
    const autoscale = { minReplicas: 1, maxReplicas: 6 };

    await applyAutoscale(
      deployment,
      deploymentType,
      autoscale,
      permanentReplicas,
      dryRun,
    );

    expect(exec.exec).not.toHaveBeenNthCalledWith(
      1,
      'kubectl',
      ['get', 'hpa', deployment],
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenCalledTimes(1);
  });

  test('It will apply CPU autoscale when configuration provided', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;
    const autoscale = { minReplicas: 1, maxReplicas: 6, cpuPercent: 25 };

    await applyAutoscale(
      deployment,
      deploymentType,
      autoscale,
      permanentReplicas,
      dryRun,
    );

    const hpaYaml = fs.readFileSync('hpa.yml').toString();

    expect(exec.exec).not.toHaveBeenCalledWith(
      'kubectl',
      ['get', 'hpa', deployment],
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'hpa.yml',
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);

    expect(hpaYaml).toBe(`
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: deployment
  namespace: deployment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: deployment-type
    name: deployment
  minReplicas: 1
  maxReplicas: 6
  targetCPUUtilizationPercentage: 25
`);
  });

  test('It will apply Pubsub autoscale when configuration provided', async () => {
    const dryRun = false;
    const deployment = 'deployment';
    const deploymentType = 'deployment-type';
    const permanentReplicas = 2;
    const autoscale = {
      minReplicas: 1,
      maxReplicas: 6,
      subscriptionName: 'subscription',
      targetAverageUndeliveredMessages: 30,
    };

    await applyAutoscale(
      deployment,
      deploymentType,
      autoscale,
      permanentReplicas,
      dryRun,
    );

    const hpaYaml = fs.readFileSync('hpa.yml').toString();

    expect(exec.exec).not.toHaveBeenCalledWith(
      'kubectl',
      ['get', 'hpa', deployment],
      expect.anything(),
    );
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'apply',
      '-f',
      'hpa.yml',
    ]);
    expect(exec.exec).toHaveBeenCalledTimes(1);

    expect(hpaYaml).toBe(`
apiVersion: autoscaling/v2beta2
kind: HorizontalPodAutoscaler
metadata:
  name: deployment
  namespace: deployment
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: deployment-type
    name: deployment
  minReplicas: 1
  maxReplicas: 6
  metrics:
  - external:
      metric:
        name: pubsub.googleapis.com|subscription|num_undelivered_messages
        selector:
          matchLabels:
            resource.labels.subscription_id: subscription
      target:
        type: AverageValue
        averageValue: 30
    type: External
`);
  });
});
