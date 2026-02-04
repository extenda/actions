import fs from 'fs';
import mockFs from 'mock-fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import getRevisions from '../../src/cloudrun/get-revisions.js';
import buildManifest from '../../src/manifests/build-manifest.js';
import checkSystem from '../../src/manifests/check-system.js';
import getImageWithSha256 from '../../src/manifests/image-sha256.js';
import { securitySpec } from '../../src/manifests/security-sidecar.js';
import handleStatefulset from '../../src/manifests/statefulset-workaround.js';
import { addNamespace } from '../../src/utils/add-namespace.js';
import readSecret from '../../src/utils/load-credentials.js';

vi.mock('../../src/manifests/check-system.js');
vi.mock('../../src/utils/add-namespace.js');
vi.mock('../../src/manifests/security-sidecar.js');
vi.mock('../../src/utils/load-credentials.js');
vi.mock('../../src/manifests/statefulset-workaround.js');
vi.mock('../../src/cloudrun/get-revisions.js');
vi.mock('../../src/utils/cluster-connection.js');
vi.mock('../../src/manifests/image-sha256.js');

const readFileSync = (file) => fs.readFileSync(file, { encoding: 'utf-8' });
const originalEnv = process.env;

vi.setConfig({ testTimeout: 30000 });

describe('buildManifest', () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockFs.restore();
    process.env = originalEnv;
  });

  beforeEach(() => {
    mockFs({});
    addNamespace.mockResolvedValueOnce('');
    getImageWithSha256.mockImplementation((name) =>
      Promise.resolve(`${name.split(':')[0]}@sha256:123`),
    );
    process.env = {
      ...originalEnv,
      GITHUB_SERVER_URL: 'https://github.com/example-organization',
      GITHUB_REPOSITORY: 'example-repository',
      GITHUB_RUN_ID: 'example-run-id',
      GITHUB_RUN_ATTEMPT: '1',
    };
  });

  test('should generate manifest file with correct content', async () => {
    // const mockWriteFile = vi.spyOn(fs, 'writeFileSync').mockImplementation();'
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
        'termination-grace-period': 90,
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    expect(checkSystem).not.toHaveBeenCalled();
    expect(securitySpec).not.toHaveBeenCalled();

    expect(readFileSync('skaffold.yaml'))
      .toContain(`apiVersion: skaffold/v2beta16
kind: Config
deploy:
  kubectl:
    manifests:
      - k8s(deploy)-*`);

    expect(readFileSync('clouddeploy.yaml'))
      .toContain(`apiVersion: deploy.cloud.google.com/v1
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    expect(checkSystem).not.toHaveBeenCalled();
    expect(securitySpec).not.toHaveBeenCalled();

    expect(readFileSync('skaffold.yaml'))
      .toContain(`apiVersion: skaffold/v4beta6
kind: Config
manifests:
  rawYaml:
    - cloudrun-service.yaml
deploy:
  cloudrun: {}
`);

    expect(readFileSync('clouddeploy.yaml'))
      .toContain(`apiVersion: deploy.cloud.google.com/v1
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

  test('should generate exclude-logs label', async () => {
    readSecret.mockResolvedValueOnce('instance-name');
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
        'request-logs': {
          'cloud-run': false,
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
          env: {},
        },
        staging: 'none',
      },
    };
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'production';

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const k8sManifest = readFileSync('cloudrun-service.yaml');

    expect(k8sManifest).toContain('exclude-logs: cloud-run');

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
  });

  test('should set OPA env vars', async () => {
    // const mockWriteFile = vi.spyOn(fs, 'writeFileSync').mockImplementation();
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate manifest with volume for StatefulSet', async () => {
    handleStatefulset.mockResolvedValueOnce();
    const image = 'example-image:latest';
    const volumes = [
      {
        'disk-type': 'ssd',
        size: '10Gi',
        'mount-path': '/mnt/data',
      },
    ];
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

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
        volumes: [
          {
            'disk-type': 'ssd',
            size: '1Gi',
            'mount-path': '/mnt/shared/data',
          },
        ],
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    // Snapshot test for k8s-manifest.yaml.
    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate cloud run service with annotations', async () => {
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
        traffic: {
          'static-egress-ip': false,
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
    const projectId = 'example-project';
    const clanName = 'example-clan';
    const env = 'dev';

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    // Snapshot test for cloudrun-service.yaml.
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should generate cloud run service with security', async () => {
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
        traffic: {
          'static-egress-ip': false,
        },
      },
      security: {
        'permission-prefix': 'tst',
        cors: { enabled: false },
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
      env: [
        {
          name: 'ENVOY_PROTOCOL',
          value: 'http',
        },
        {
          name: 'ENVOY_CORS',
          value: 'false',
        },
      ],
    };

    checkSystem.mockResolvedValueOnce(true);
    securitySpec.mockResolvedValueOnce(securityContainer);

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
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
        'termination-grace-period': 90,
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
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

    await expect(
      buildManifest(
        image,
        service,
        projectId,
        clanName,
        env,
        '',
        '',
        '',
        '',
        '',
      ),
    ).rejects.toThrow('Bundle not found with the name tst.example-service-dev');
  });

  test('It should set traffic to 0 of new revision if serve traffic is false', async () => {
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It should fail deploy if more than 1 active revisions while serve traffic false', async () => {
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

    await expect(
      buildManifest(
        image,
        service,
        projectId,
        clanName,
        env,
        '',
        '',
        '',
        '',
        '',
      ),
    ).rejects.toThrow(
      '2 active revisions found, set revision to 100% traffic before deploying',
    );
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
        traffic: {
          'static-egress-ip': false,
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

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
          schedule: [
            {
              'scale-hours': '08:00-20:00',
            },
          ],
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');
    const podMonitorManifest = readFileSync('k8s(deploy)-podmonitor.yaml');

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
    expect(podMonitorManifest).toMatchSnapshot();
  });

  test('It generates a collector if OTEL configured', async () => {
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
          'open-telemetry': {
            config: 'auto',
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const k8sManifest = readFileSync('k8s(deploy)-manifest.yaml');

    // Snapshot test for k8s-manifest.yaml.
    mockFs.restore();
    expect(k8sManifest).toMatchSnapshot();
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It generates a OTEL collector sidecar if OTEL is configured on Cloud Run', async () => {
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
          'open-telemetry': {
            config: 'auto',
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It allows for deploying on new vpc subnet without NAT', async () => {
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
        traffic: {
          'static-egress-ip': false,
          'direct-vpc-connection': true,
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('It allows for deploying on without VPC connection', async () => {
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
        traffic: {
          'static-egress-ip': false,
          'direct-vpc-connection': false,
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

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );
    const manifest = readFileSync('cloudrun-service.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('deploys with envoy auth proxy if set to envoy-opa', async () => {
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
        'auth-proxy': 'envoy-opa',
      },
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

    const securityContainer = {
      name: 'security-authz',
      image: 'image',
      ports: [
        {
          name: 'http1',
          containerPort: 8000,
        },
      ],
      env: [
        {
          name: 'ENVOY_PROTOCOL',
          value: 'http',
        },
      ],
    };

    checkSystem.mockResolvedValueOnce(true);
    securitySpec.mockResolvedValueOnce(securityContainer);

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });

  test('deploys without envoy auth proxy if set to none', async () => {
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
        'auth-proxy': 'none',
      },
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

    checkSystem.mockResolvedValueOnce(true);

    await buildManifest(
      image,
      service,
      projectId,
      clanName,
      env,
      '',
      '',
      '',
      '',
      '',
    );

    const manifest = readFileSync('k8s(deploy)-manifest.yaml');
    mockFs.restore();
    expect(manifest).toMatchSnapshot();
  });
});
