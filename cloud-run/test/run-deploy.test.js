const mockFs = require('mock-fs');

jest.mock('@actions/exec');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const runDeploy = require('../src/run-deploy');

const serviceAccountKey = Buffer.from('test', 'utf8').toString('base64');

const orgEnv = process.env;

describe('Run Deploy', () => {
  beforeEach(() => {
    process.env = { ...orgEnv };
    process.env.GITHUB_SHA = '63633c0'; // v.0.18.0
  });
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
    process.env = orgEnv;
  });

  test('It can deploy to managed Cloud Run', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      platform: {
        managed: {
          region: 'eu-west1',
          'allow-unauthenticated': true,
        },
      },
    };
    const returnValue = await runDeploy(
      serviceAccountKey,
      service,
      'runtime@google.com',
      'gcr.io/test-project/my-service:tag',
    );
    expect(returnValue).toEqual(0);
    expect(setupGcloud).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'run', 'deploy', 'my-service',
      '--image=gcr.io/test-project/my-service:tag',
      '--service-account=runtime@google.com',
      '--project=test-project',
      '--memory=256Mi',
      '--concurrency=default',
      '--max-instances=default',
      '--revision-suffix=v0.18.0',
      '--clear-env-vars',
      '--clear-cloudsql-instances',
      '--cpu=1',
      '--platform=managed',
      '--region=eu-west1',
      '--allow-unauthenticated',
    ]);
  });

  test('It can deploy with environment', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    process.env.GITHUB_SHA = '382aee2'; // Not tagged
    const service = {
      name: 'my-service',
      memory: '256Mi',
      environment: {
        KEY1: 'value',
        KEY2: 'sm://*/my-secret',
      },
      platform: {
        managed: {
          region: 'eu-west1',
          'allow-unauthenticated': true,
        },
      },
    };
    await runDeploy(
      serviceAccountKey,
      service,
      'runtime@google.com',
      'gcr.io/test-project/my-service:tag',
    );
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'run', 'deploy', 'my-service',
      '--image=gcr.io/test-project/my-service:tag',
      '--service-account=runtime@google.com',
      '--project=test-project',
      '--memory=256Mi',
      '--concurrency=default',
      '--max-instances=default',
      '--revision-suffix=382aee2',
      '--set-env-vars=KEY1="value",KEY2="sm://test-project/my-secret"',
      '--clear-cloudsql-instances',
      '--cpu=1',
      '--platform=managed',
      '--region=eu-west1',
      '--allow-unauthenticated',
    ]);
  });

  test('It can deploy authenticated', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      platform: {
        managed: {
          region: 'eu-west1',
          'allow-unauthenticated': false,
        },
      },
    };
    const returnValue = await runDeploy(
      serviceAccountKey,
      service,
      'runtime@google.com',
      'gcr.io/test-project/my-service:tag',
    );
    expect(returnValue).toEqual(0);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.not.arrayContaining(['--allow-unauthenticated']));
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.arrayContaining(['--no-allow-unauthenticated']));
  });

  test('It can deploy with sql-instances', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      'cloud-sql-instances': ['MY-INSTANCE'],
      platform: {
        managed: {
          region: 'eu-west1',
          'allow-unauthenticated': false,
        },
      },
    };
    const returnValue = await runDeploy(
      serviceAccountKey,
      service,
      'runtime@google.com',
      'gcr.io/test-project/my-service:tag',
    );
    expect(returnValue).toEqual(0);
    expect(exec.exec.mock.calls[0][1]).toEqual(expect.not.arrayContaining(['--set-cloudsql-instances=MY-INSTANCE']));
  });

  test('It can deploy to Cloud Run on GKE', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      platform: {
        gke: {
          cluster: 'test',
          'cluster-location': 'eu-west1-b',
          connectivity: 'external',
          cpu: '400m',
          namespace: 'my-space',
        },
      },
    };
    const returnValue = await runDeploy(
      serviceAccountKey,
      service,
      'runtime@google.com',
      'gcr.io/test-project/my-service:tag',
    );
    expect(returnValue).toEqual(0);
    expect(setupGcloud).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledTimes(1);
    expect(exec.exec).toHaveBeenCalledWith('gcloud', [
      'run', 'deploy', 'my-service',
      '--image=gcr.io/test-project/my-service:tag',
      '--service-account=runtime@google.com',
      '--project=test-project',
      '--memory=256Mi',
      '--concurrency=default',
      '--max-instances=default',
      '--revision-suffix=v0.18.0',
      '--clear-env-vars',
      '--clear-cloudsql-instances',
      '--cpu=400m',
      '--platform=gke',
      '--cluster=test',
      '--cluster-location=eu-west1-b',
      '--connectivity=external',
      '--namespace=my-space',
    ]);
  });
});
