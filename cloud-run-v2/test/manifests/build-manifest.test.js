const fs = require('fs');
const buildManifest = require('../../src/manifests/build-manifest');

jest.mock('fs');

describe('buildManifest', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate manifest file with correct content', async () => {
    const mockWriteFile = jest.spyOn(fs, 'writeFile').mockImplementation();

    const image = 'example-image:latest';
    const service = {
      name: 'example-service',
      memory: '512Mi',
      cpu: '1',
      'max-instances': 10,
      'min-instances': 1,
      'opa-enabled': false,
      environment: {
        KEY1: 'value1',
        KEY2: 'value2',
      },
      labels: {
        label1: 'labelValue1',
        label2: 'labelValue2',
      },
      platform: {
        gke: {
          readiness: {
            http: {
              path: '/custom-health',
            },
          },
        },
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    await buildManifest(image, service, projectId, clanName, env);

    expect(mockWriteFile).toHaveBeenCalledTimes(3);

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      1,
      'skaffold.yaml',
      expect.stringContaining('apiVersion: skaffold/v2beta16\nkind: Config\ndeploy:\n  kubectl:\n    manifests:\n      - k8s-*\n'),
      expect.any(Function)
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      2,
      'clouddeploy.yaml',
      expect.stringContaining(
        'apiVersion: deploy.cloud.google.com/v1\nkind: DeliveryPipeline\nmetadata:\n  name: example-service\n'
      ),
      expect.any(Function)
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      3,
      'k8s-manifest.yaml',
      expect.stringContaining('---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: example-service\n'),
      expect.any(Function)
    );
  });
});
