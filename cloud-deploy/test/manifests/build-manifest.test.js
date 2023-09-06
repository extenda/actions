const fs = require('fs');
const yaml = require('js-yaml');
const buildManifest = require('../../src/manifests/build-manifest');
const checkSystem = require('../../src/manifests/check-system');
const buildOpaConfig = require('../../src/manifests/opa-config');

jest.mock('fs');
jest.mock('../../src/manifests/check-system');
jest.mock('../../src/manifests/opa-config');
jest.mock('../../src/utils/add-namespace');

describe('buildManifest', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should generate manifest file with correct content', async () => {
    const mockWriteFile = jest.spyOn(fs, 'writeFile').mockImplementation();

    const image = 'example-image:latest';
    const service = {
      kubernetes: {
        type: 'Deployment',
        service: 'example-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          cpu: 40,
        },
      },
      security: 'none',
      labels: {
        label1: 'labelValue1',
        label2: 'labelValue2',
      },
      environments: {
        production: {
          'min-instances': 1,
          'max-instances': 10,
          env: {
            KEY1: 'value1',
            KEY2: 'value2',
          },
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(image, service, projectId, clanName, env, 'styra-token');

    expect(checkSystem).not.toHaveBeenCalled();

    expect(mockWriteFile).toHaveBeenCalledWith(
      'skaffold.yaml',
      expect.stringContaining(`apiVersion: skaffold/v2beta16
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s-*`),
      expect.anything(),
    );

    expect(mockWriteFile).toHaveBeenCalledWith(
      'clouddeploy.yaml',
      expect.stringContaining(`apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: example-service`),
      expect.anything(),
    );

    expect(mockWriteFile).not.toHaveBeenCalledWith(
      'k8s-opa-config.yaml',
      expect.any(String),
      expect.anything(),
    );

    expect(mockWriteFile).toHaveBeenCalledWith(
      'k8s-manifest.yaml',
      expect.stringContaining(`apiVersion: v1
kind: Namespace
metadata:
  name: example-service`),
      expect.any(Function),
    );
  });

  test('should generate opa manifest', async () => {
    const mockWriteFile = jest.spyOn(fs, 'writeFile').mockImplementation();
    checkSystem.mockResolvedValueOnce({ id: 'some-id' });

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

    buildOpaConfig.mockResolvedValueOnce(yaml.dump(opaConfig));

    const image = 'example-image:latest';
    const service = {
      kubernetes: {
        type: 'Deployment',
        service: 'example-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          cpu: 40,
        },
      },
      security: {
        'permission-prefix': 'tst',
      },
      labels: {
        label1: 'labelValue1',
        label2: 'labelValue2',
      },
      environments: {
        production: {
          'min-instances': 1,
          'max-instances': 10,
          env: {
            KEY1: 'value1',
            KEY2: 'value2',
          },
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    await buildManifest(image, service, projectId, clanName, env, 'styra-token');

    expect(mockWriteFile).toHaveBeenCalledWith(
      'k8s-opa-config.yaml',
      expect.stringContaining(`kind: ConfigMap
apiVersion: v1
metadata:
  name: opa-envoy-config
  namespace: service-name
data:
  conf.yaml: |
    services:
        - name: styra`),
      expect.anything(),
    );
  });
});
