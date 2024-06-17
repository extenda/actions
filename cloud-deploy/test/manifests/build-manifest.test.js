const mockFs = require('mock-fs');
const fs = require('fs');
const buildManifest = require('../../src/manifests/build-manifest');
const checkSystem = require('../../src/manifests/check-system');
const securitySpec = require('../../src/manifests/security-sidecar');
const handleStatefulset = require('../../src/manifests/statefulset-workaround');
const { addNamespace } = require('../../src/utils/add-namespace');
const readSecret = require('../../src/utils/load-credentials');
const checkVpcConnector = require('../../src/utils/check-vpc-connector');
const getRevisions = require('../../src/cloudrun/get-revisions');
const getImageWithSha256 = require('../../src/manifests/image-sha256');

jest.mock('../../src/manifests/check-system');
jest.mock('../../src/utils/add-namespace');
jest.mock('../../src/manifests/security-sidecar');
jest.mock('../../src/utils/load-credentials');
jest.mock('../../src/manifests/statefulset-workaround');
jest.mock('../../src/utils/check-vpc-connector');
jest.mock('../../src/cloudrun/get-revisions');
jest.mock('../../src/utils/cluster-connection');
jest.mock('../../src/manifests/image-sha256');

const readFileSync = (file) => fs.readFileSync(file, { encoding: 'utf-8' });
const basemetadata = {
  baseAnnotations: {
    'job-trigger': 'https://github.com/example-organization/example-repository/actions/runs/example-run-id/attempts/1',
  },
};

describe('buildManifest', () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockFs.restore();
  });

  beforeEach(() => {
    mockFs({});
    addNamespace.mockResolvedValueOnce('');
    getImageWithSha256.mockImplementation((name) => Promise.resolve(`${name.split(':')[0]}@sha256:123`));
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
        product: 'actions',
        component: 'jest',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    expect(checkSystem).not.toHaveBeenCalled();
    expect(securitySpec).not.toHaveBeenCalled();

    expect(readFileSync('skaffold.yaml')).toContain(`apiVersion: skaffold/v2beta16
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s(deploy)-*`);

    expect(readFileSync('clouddeploy.yaml')).toContain(`apiVersion: deploy.cloud.google.com/v1
kind: DeliveryPipeline
metadata:
  name: example-service`);

    expect(fs.existsSync('k8s(deploy)-opa-config.yaml')).toEqual(false);

    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');

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
!k8s(deploy)-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`);

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('should generate manifest cloudrun file with correct content', async () => {
    readSecret.mockResolvedValueOnce('instance-name');
    checkVpcConnector.mockResolvedValueOnce('example-clan-vpc-connector');
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
            SQL_INSTANCE_NAME: 'sm://*/test-instance-name',
          },
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

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

    expect(fs.existsSync('k8s(deploy)opa-config.yaml')).toEqual(false);

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
              valueFrom:
                secretKeyRef:
                  key: latest
                  name: test-secret`);

    expect(k8sManifest).toContain(`
    spec:
      containerConcurrency: 40`);

    expect(readFileSync('.gcloudignore')).toEqual(`*
!k8s(deploy)-*
!skaffold.yaml
!clouddeploy.yaml
!cloudrun-service.yaml
`);

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('should set OPA env vars', async () => {
    // const mockWriteFile = jest.spyOn(fs, 'writeFileSync').mockImplementation();
    checkSystem.mockResolvedValueOnce(true);
    securitySpec.mockResolvedValueOnce({
      name: 'security-authz',
      image: 'eu.gcr.io/extenda/security:authz',
      ports: [{ containerPort: 9001 }],
      env: [{ name: 'ENVOY_PROTOCOL', value: 'http' }],
      volumeMounts: [{ mountPath: '/config', name: 'opa', readOnly: true }],
    });

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
        product: 'actions',
        component: 'jest',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate manifest with volume for StatefulSet', async () => {
    handleStatefulset.mockResolvedValueOnce();
    const image = 'example-image:latest';
    const volumes = [{
      'disk-type': 'ssd',
      size: '10Gi',
      'mount-path': '/mnt/data',
    }];
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
        volumes,
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
      },
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
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
      labels: {
        product: 'actions',
        component: 'jest',
        'iso-country': 'se',
        'tenant-alias': 'testrunner',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate cloud run service with annotations', async () => {
    checkVpcConnector.mockResolvedValueOnce('example-clan-vpc-connector');
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
          concurrency: 80,
        },
        'startup-cpu-boost': true,
        'cpu-throttling': false,
        'session-affinity': true,
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    // Snapshot test for cloudrun-service.yaml.
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate cloud run service with security', async () => {
    checkVpcConnector.mockResolvedValueOnce('example-clan-vpc-connector');
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
          concurrency: 80,
        },
        'startup-cpu-boost': true,
        'cpu-throttling': false,
        'session-affinity': true,
        'vpc-connector': true,
      },
      security: {
        'permission-prefix': 'tst',
      },
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
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

    const securityContainer = {
      name: 'security-authz',
      image: 'image',
      ports: [
        {
          name: 'http1',
          containerPort: 8000,
        },
      ],
      env: [{
        name: 'ENVOY_PROTOCOL',
        value: 'http',
      }],
    };

    checkSystem.mockResolvedValueOnce(true);
    securitySpec.mockResolvedValueOnce(securityContainer);

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    // Snapshot test for cloudrun-service.yaml.
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('should generate manifest file with correct content for availability high', async () => {
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
        availability: 'high',
      },
      security: 'none',
      labels: {
        label1: 'labelValue1',
        label2: 'labelValue2',
        product: 'actions',
        component: 'jest',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);
    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });
  test('should generate manifest file with correct content for availability low', async () => {
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
        availability: 'low',
      },
      security: 'none',
      labels: {
        label1: 'labelValue1',
        label2: 'labelValue2',
        product: 'actions',
        component: 'jest',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);
    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');
    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });
  test('should generate manifest file with correct content for staging', async () => {
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
        product: 'actions',
        component: 'jest',
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
        staging: {
          'min-instances': 1,
          'max-instances': 2,
          env: {
            KEY1: 'value1',
          },
        },
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'staging';

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);
    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');
    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('It should fail deploy if bundle is missing', async () => {
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
          concurrency: 80,
        },
        'startup-cpu-boost': true,
        'cpu-throttling': false,
        'session-affinity': true,
        'vpc-connector': true,
      },
      security: {
        'permission-prefix': 'tst',
      },
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
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

    checkSystem.mockResolvedValueOnce(false);

    await expect(buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata)).rejects.toThrow('Bundle not found with the name tst.example-service-dev');
  });

  test('It should set traffic to 0 of new revision if serve traffic is false', async () => {
    checkVpcConnector.mockResolvedValueOnce('example-clan-vpc-connector');
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
          concurrency: 80,
        },
        traffic: {
          'serve-traffic': false,
        },
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
          env: {
            KEY1: 'value1',
            KEY2: 'value2',
          },
        },
        staging: 'none',
      },
    };

    const revisionList = [
      {
        name: 'example-service-lsublujx',
        creationTimestamp: '2000-01-20T12:07:33.625666Z',
        active: true,
      },
      {
        name: 'example-service-lsp6cqoi',
        creationTimestamp: '2000-01-16T21:41:40.238306Z',
        active: false,
      },
      {
        name: 'example-service-lsovta6v',
        creationTimestamp: '2000-01-16T16:46:36.362567Z',
        active: false,
      },
    ];

    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    getRevisions.mockResolvedValueOnce(revisionList);

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should fail deploy if more than 1 active revisions while serve traffic false', async () => {
    checkVpcConnector.mockResolvedValueOnce('example-clan-vpc-connector');
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
          concurrency: 80,
        },
        traffic: {
          'serve-traffic': false,
        },
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
          env: {
            KEY1: 'value1',
            KEY2: 'value2',
          },
        },
        staging: 'none',
      },
    };

    const revisionList = [
      {
        name: 'example-service-lsublujx',
        creationTimestamp: '2000-01-20T12:07:33.625666Z',
        active: true,
      },
      {
        name: 'example-service-lsp6cqoi',
        creationTimestamp: '2000-01-16T21:41:40.238306Z',
        active: true,
      },
      {
        name: 'example-service-lsovta6v',
        creationTimestamp: '2000-01-16T16:46:36.362567Z',
        active: false,
      },
    ];

    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    getRevisions.mockResolvedValueOnce(revisionList);

    await expect(buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata)).rejects.toThrow('2 active revisions found, set revision to 100% traffic before deploying');
  });

  test('It should deploy with iam bindings and audiences', async () => {
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
          concurrency: 80,
        },
      },
      security: {
        consumers: {
          'service-accounts': [
            'example-service@example-project.gserviceaccount.com',
            'user:some-user@domain.com',
            'group:some-group@domain.com',
          ],
          audiences: ['example-service', 'https://example-service.domain.com'],
        },
      },
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate manifest with service-level-min-instances', async () => {
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
          concurrency: 80,
          schedule: [{
            'scale-hours': '08:00-20:00',
          }],
        },
      },
      security: {
        consumers: {
          'service-accounts': [
            'example-service@example-project.gserviceaccount.com',
            'user:some-user@domain.com',
            'group:some-group@domain.com',
          ],
          audiences: ['example-service', 'https://example-service.domain.com'],
        },
      },
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It generates a podmonitor if configured', async () => {
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
        monitoring: {
          prometheus: {
            interval: 60,
          },
        },
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
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

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);

    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');
    const podMonitorManifest = readFileSync('k8s(deploy)-podmonitor.yaml');

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
    expect(podMonitorManifest).toMatchSnapshot();
  });

  test('It generates a collector sidecar if monitoring is configured on Cloud Run', async () => {
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
        monitoring: {
          prometheus: {
            interval: 15,
          },
        },
      },
      security: 'none',
      labels: {
        product: 'actions',
        component: 'jest',
      },
      environments: {
        production: {
          'min-instances': 1,
          'max-instances': 10,
          env: {},
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(image, service, projectId, clanName, env, '', '', '', '', '', basemetadata);
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();

  });
});
