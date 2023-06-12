const createExternalLoadbalancer = require('../../../src/loadbalancing/external/create-external-loadbalancer');
const gcloudOutput = require('../../../src/utils/gcloud-output');

// Mock the gcloudOutput function
jest.mock('../../../src/utils/gcloud-output', () => jest.fn());

describe('createExternalLoadbalancer', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should create a 404 bucket and load balancer with health check', async () => {
    const projectID = 'my-project-staging-id';
    const env = 'staging';

    gcloudOutput
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce()
      .mockResolvedValueOnce();

    await createExternalLoadbalancer(projectID, env);

    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'mb',
      '-c',
      'standard',
      '-l',
      'europe-west1',
      '-p',
      projectID,
      '-b',
      'on',
      `gs://${projectID.split("-" + env)[0] + "-" + env}-404`,
    ], 'gsutil');

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'compute',
      'backend-buckets',
      'create',
      `${projectID.split("-" + env)[0]}-${env}-404`,
      `--gcs-bucket-name=${projectID.split("-" + env)[0]}-${env}-404`,
      `--project=${projectID}`,
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'compute',
      'url-maps',
      'create',
      `${projectID.split("-" + env)[0]}-${env}-lb-external`,
      `--project=${projectID}`,
      `--default-backend-bucket=${projectID.split("-" + env)[0]}-${env}-404`,
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(4, [
      'compute',
      'health-checks',
      'create',
      'tcp',
      `${projectID}-external-hc`,
      '--global',
      '--use-serving-port',
      '--check-interval=10s',
      `--project=${projectID}`,
    ]);
  });

  it('should not create a bucket or load balancer if they already exist', async () => {
    const projectID = 'my-project-id';
    const env = 'staging';
    
    gcloudOutput.mockRejectedValueOnce();
    gcloudOutput.mockImplementation(() => Promise.resolve());
    gcloudOutput.mockRejectedValueOnce();
    gcloudOutput.mockRejectedValueOnce();

    await createExternalLoadbalancer(projectID, env);

    expect(gcloudOutput).toHaveBeenCalledTimes(4);
    expect(gcloudOutput).toHaveBeenNthCalledWith(1, [
      'mb',
      '-c',
      'standard',
      '-l',
      'europe-west1',
      '-p',
      projectID,
      '-b',
      'on',
      `gs://${projectID.split("-" + env)[0] + "-" + env}-404`,
    ], 'gsutil');

    expect(gcloudOutput).toHaveBeenNthCalledWith(2, [
      'compute',
      'url-maps',
      'create',
      `${projectID.split("-" + env)[0]}-${env}-lb-external`,
      `--project=${projectID}`,
      `--default-backend-bucket=${projectID.split("-" + env)[0]}-${env}-404`,
    ]);

    expect(gcloudOutput).toHaveBeenNthCalledWith(3, [
      'compute',
      'health-checks',
      'create',
      'tcp',
      `${projectID}-external-hc`,
      '--global',
      '--use-serving-port',
      '--check-interval=10s',
      `--project=${projectID}`,
    ]);
  });
});
