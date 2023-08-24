const fs = require('fs');
const yaml = require('js-yaml');
const buildManifest = require('../../src/manifests/build-manifest');
const checkSystem = require('../../src/manifests/check-system');
const buildOpaConfig = require('../../src/manifests/opa-config');

jest.mock('fs');
jest.mock('../../src/manifests/check-system');
jest.mock('../../src/manifests/opa-config');

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

    await buildManifest(image, service, projectId, clanName, env, 'styra-token');

    expect(mockWriteFile).toHaveBeenCalledTimes(3);

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      1,
      'skaffold.yaml',
      expect.stringContaining('apiVersion: skaffold/v2beta16\nkind: Config\ndeploy:\n  kubectl:\n    manifests:\n      - k8s-*\n'),
      expect.any(Function),
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      2,
      'clouddeploy.yaml',
      expect.stringContaining(
        'apiVersion: deploy.cloud.google.com/v1\nkind: DeliveryPipeline\nmetadata:\n  name: example-service\n',
      ),
      expect.any(Function),
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      3,
      'k8s-manifest.yaml',
      expect.stringContaining('---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: example-service\n'),
      expect.any(Function),
    );
  });

  test('should generate opa manifest', async () => {
    const mockWriteFile = jest.spyOn(fs, 'writeFile').mockImplementation();
    checkSystem.mockImplementation(() => Promise.resolve({ id: 'some-id' }));

    const opaConfig = {
      kind: 'ConfigMap',
      apiVersion: 'v1',
      metadata: {
        name: 'opa-envoy-config',
        namespace: 'service-name',
      },
      data: {
        'conf.yaml': `services:
    - name: styra
      url: url
      credentials:
        bearer:
          token: "styraToken"
  labels:
    system-id: "some-id"
    system-type: "envoy"
  discovery:
    name: discovery
    prefix: "/systems/some-id"\n`,
      },
    };

    buildOpaConfig.mockImplementation(() => Promise.resolve(yaml.dump(opaConfig)));

    const image = 'example-image:latest';
    const service = {
      name: 'example-service',
      memory: '512Mi',
      'opa-enabled': true,
      cpu: '1',
      'max-instances': 10,
      'min-instances': 1,
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

    await buildManifest(image, service, projectId, clanName, env, 'styra-token');

    expect(mockWriteFile).toHaveBeenCalledTimes(4);

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      1,
      'skaffold.yaml',
      expect.stringContaining('apiVersion: skaffold/v2beta16\nkind: Config\ndeploy:\n  kubectl:\n    manifests:\n      - k8s-*\n'),
      expect.any(Function),
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      2,
      'clouddeploy.yaml',
      expect.stringContaining(
        'apiVersion: deploy.cloud.google.com/v1\nkind: DeliveryPipeline\nmetadata:\n  name: example-service\n',
      ),
      expect.any(Function),
    );

    expect(mockWriteFile).toHaveBeenNthCalledWith(
      4,
      'k8s-manifest.yaml',
      expect.stringContaining('---\napiVersion: v1\nkind: Namespace\nmetadata:\n  name: example-service\n'),
      expect.any(Function),
    );
  });
});
