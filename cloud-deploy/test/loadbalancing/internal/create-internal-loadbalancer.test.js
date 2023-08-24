const createInternalLoadbalancer = require('../../../src/loadbalancing/internal/create-internal-loadbalancer');
const gcloudOutput = require('../../../src/utils/gcloud-output');

jest.mock('../../../src/utils/gcloud-output');

describe('createInternalLoadbalancer', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create internal load balancer with correct parameters', async () => {
    gcloudOutput.mockResolvedValue();

    const projectID = 'my-project';
    const env = 'dev';
    const name = 'my-service';

    await createInternalLoadbalancer(projectID, env, name);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'url-maps',
      'create',
      `${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
      `--project=${projectID}`,
      '--region=europe-west1',
      `--default-service=${name}-internal-backend`,
    ]);
  });

  test('should handle failure gracefully', async () => {
    gcloudOutput.mockRejectedValue(new Error('Command failed'));

    const projectID = 'my-project';
    const env = 'dev';
    const name = 'my-service';

    const result = await createInternalLoadbalancer(projectID, env, name);

    expect(gcloudOutput).toHaveBeenCalledWith([
      'compute',
      'url-maps',
      'create',
      `${projectID.split(`-${env}`)[0]}-${env}-lb-internal`,
      `--project=${projectID}`,
      '--region=europe-west1',
      `--default-service=${name}-internal-backend`,
    ]);

    expect(result).toBe(false);
  });
});
