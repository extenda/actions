const mockFs = require('mock-fs');
const fs = require('fs');
const yaml = require('js-yaml');
const buildManifest = require('../../src/manifests/build-manifest');
const checkSystem = require('../../src/manifests/check-system');
const buildOpaConfig = require('../../src/manifests/opa-config');
const securitySpec = require('../../src/manifests/security-sidecar');
const { addNamespace } = require('../../src/utils/add-namespace');

jest.mock('../../src/manifests/check-system');
jest.mock('../../src/manifests/opa-config');
jest.mock('../../src/utils/add-namespace');
jest.mock('../../src/manifests/security-sidecar');

const readFileSync = (file) => fs.readFileSync(file, { encoding: 'utf-8' });

describe('buildManifest', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockFs.restore();
  });

  beforeEach(() => {
    mockFs({});
    addNamespace.mockResolvedValueOnce('');
  });

  test('should generate manifest file with correct content', async () => {
    // const mockWriteFile = jest.spyOn(fs, 'writeFileSync').mockImplementation();'
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
            KEY3: '8080',
            SECRET: 'sm://*/test-secret',
          },
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(image, service, projectId, clanName, env, 'styra-token', '', '', '', '', '', '');

    expect(checkSystem).not.toHaveBeenCalled();
    expect(securitySpec).not.toHaveBeenCalled();

    expect(readFileSync('skaffold.yaml')).toContain(`apiVersion: skaffold/v4beta6
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s-*`);

    expect(readFileSync('clouddeploy.yaml')).toContain(`apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: example-service`);

    expect(fs.existsSync('k8s-opa-config.yaml')).toEqual(false);

    const k8sManifest = readFileSync('k8s-manifest.yaml');

    expect(k8sManifest).toContain(`apiVersion: v1
kind: Namespace
metadata:
  name: example-service`);

    expect(k8sManifest).toContain(`
            - name: KEY3
              value: '8080'`);

    expect(k8sManifest).toContain(`
            - name: SECRET
              value: sm://example-project/test-secret`);

    expect(readFileSync('.gcloudignore')).toEqual(`*
!k8s-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`);

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('should generate manifest cloudrun file with correct content', async () => {
    const image = 'example-image:latest';
    const service = {
      'cloud-run': {
        service: 'example-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          concurrency: 40,
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
            KEY3: '8080',
            SECRET: 'sm://*/test-secret',
          },
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(image, service, projectId, clanName, env, 'styra-token', '', '', '', '', '', '');

    expect(checkSystem).not.toHaveBeenCalled();
    expect(securitySpec).not.toHaveBeenCalled();

    expect(readFileSync('skaffold.yaml')).toContain(`apiVersion: skaffold/v4beta6
kind: Config
manifests:
  rawYaml:
    - cloudrun-service.yaml
deploy:
  cloudrun: {}
`);

    expect(readFileSync('clouddeploy.yaml')).toContain(`apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: example-service`);

    expect(fs.existsSync('k8s-opa-config.yaml')).toEqual(false);

    const k8sManifest = readFileSync('cloudrun-service.yaml');

    expect(k8sManifest).toContain(`apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: example-service`);

    expect(k8sManifest).toContain(`
            - name: KEY3
              value: '8080'`);

    expect(k8sManifest).toContain(`
            - name: SECRET
              value: sm://example-project/test-secret`);

    expect(k8sManifest).toContain(`
    spec:
      containerConcurrency: 40`);

    expect(readFileSync('.gcloudignore')).toEqual(`*
!k8s-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`);

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('should generate opa manifest', async () => {
    // const mockWriteFile = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    checkSystem.mockResolvedValueOnce({ id: 'some-id' });
    securitySpec.mockResolvedValueOnce({
      name: 'security-authz',
      image: 'eu.gcr.io/extenda/security:authz',
      ports: [{ containerPort: 9001 }],
      env: [{ name: 'ENVOY_PROTOCOL', value: 'http' }],
      volumeMounts: [{ mountPath: '/config', name: 'opa', readOnly: true }],
    });

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

    await buildManifest(image, service, projectId, clanName, env, 'styra-token', '', '', '', '', '', '');

    expect(readFileSync('k8s-opa-config.yaml')).toContain(`kind: ConfigMap
apiVersion: v1
metadata:
  name: opa-envoy-config
  namespace: service-name
data:
  conf.yaml: |
    services:
        - name: styra`);

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate manifest without HPA for static StatefulSet', async () => {
    const image = 'example-image:latest';
    const service = {
      kubernetes: {
        type: 'StatefulSet',
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
      environments: {
        production: {
          'min-instances': 3,
          'max-instances': 3,
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    await buildManifest(image, service, projectId, clanName, env, 'styra-token', '', '', '', '', '', '');

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate manifest with volumes for StatefulSet', async () => {
    const image = 'example-image:latest';
    const service = {
      kubernetes: {
        type: 'StatefulSet',
        service: 'example-service',
        resources: {
          cpu: 1,
          memory: '512Mi',
        },
        protocol: 'http',
        scaling: {
          cpu: 40,
        },
        volumes: [{
          'disk-type': 'ssd',
          size: '1Gi',
          'mount-path': '/mnt/shared/data',
        }],
      },
      security: 'none',
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

    await buildManifest(image, service, projectId, clanName, env, 'styra-token', '', '', '', '', '', '');

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });
});
