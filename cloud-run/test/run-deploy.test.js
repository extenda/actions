const mockFs = require('mock-fs');

jest.mock('@actions/exec');
jest.mock('../../setup-gcloud/src/setup-gcloud');

const exec = require('@actions/exec');
const setupGcloud = require('../../setup-gcloud/src/setup-gcloud');
const runDeploy = require('../src/run-deploy');

const serviceAccountKey = Buffer.from('test', 'utf8').toString('base64');

describe('Run Deploy', () => {
  afterEach(() => {
    jest.resetAllMocks();
    mockFs.restore();
  });

  test('It can deploy to managed Cloud Run', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      allowUnauthenticated: true,
      runsOn: {
        platform: 'managed',
        region: 'eu-west1',
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
      '--allow-unauthenticated',
      '--platform=managed',
      '--region=eu-west1',
    ]);
  });

  test('It can deploy authenticated', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      allowUnauthenticated: false,
      runsOn: {
        platform: 'managed',
        region: 'eu-west1',
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
  });

  test('It an deploy to Cloud Run on GKE', async () => {
    exec.exec.mockResolvedValueOnce(0);
    setupGcloud.mockResolvedValueOnce('test-project');
    const service = {
      name: 'my-service',
      memory: '256Mi',
      allowUnauthenticated: true,
      runsOn: {
        platform: 'gke',
        cluster: 'test',
        clusterLocation: 'eu-west1-b',
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
      '--allow-unauthenticated',
      '--platform=gke',
      '--cluster=test',
      '--cluster-location=eu-west1-b',
    ]);
  });
});
