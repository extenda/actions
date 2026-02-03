jest.mock('@actions/exec');
jest.mock('../src/extract-output.js');
jest.mock('../../utils', () => ({
  getImageDigest: jest.fn(),
}));

import * as exec from '@actions/exec';

import { getImageDigest } from '../../utils';
import extract from '../src/extract-output.js';
import podRun from '../src/run-pod.js';

const orgEnv = process.env;

describe('Pod run', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REPOSITORY: 'extenda/actions',
      GITHUB_SHA: '15b1e9856fc56aaf79ddece96c0d931bf67227f0',
    };
    exec.exec.mockResolvedValue(0);
    extract.extractOutput.mockResolvedValueOnce(null);
  });
  afterEach(() => {
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It will run test without config map', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    await podRun({ name: '', namespace: 'test' }, 'myimage', null, false);
    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
          },
        ],
      },
    };
    expect(exec.exec).toHaveBeenCalledWith(
      'kubectl',
      [
        'run',
        'actions-15b1e98-test',
        '--rm',
        '--attach',
        '--restart=Never',
        '--pod-running-timeout=15m',
        '--image=myimage@sha256:111',
        '-n',
        'test',
        `--overrides=${JSON.stringify(override)}`,
      ],
      expect.objectContaining({ silent: true }),
    );
  });

  test('It will run test with complete config map', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    await podRun(
      { name: 'test', namespace: 'test' },
      'myimage',
      {
        name: 'testmap',
        workingDirectory: true,
        entrypoint: true,
      },
      false,
    );

    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
            workingDir: '/work',
            volumeMounts: [
              {
                mountPath: '/work',
                name: 'workspace',
                readOnly: false,
              },
            ],
            env: [
              {
                name: 'SERVICE_URL',
                value: 'http://test.test',
              },
            ],
            command: ['/bin/sh', 'entrypoint.sh'],
          },
        ],
        volumes: [
          {
            name: 'workspace',
            configMap: {
              name: 'testmap',
            },
          },
        ],
      },
    };
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        '--env=SERVICE_URL=http://test.test',
        `--overrides=${JSON.stringify(override)}`,
      ]),
    );
  });

  test('It will run test without entrypoint in map', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    await podRun(
      { name: '', namespace: 'test' },
      'myimage',
      {
        name: 'testmap',
        workingDirectory: true,
        entrypoint: false,
      },
      false,
    );

    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
            workingDir: '/work',
            volumeMounts: [
              {
                mountPath: '/work',
                name: 'workspace',
                readOnly: false,
              },
            ],
          },
        ],
        volumes: [
          {
            name: 'workspace',
            configMap: {
              name: 'testmap',
            },
          },
        ],
      },
    };
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([`--overrides=${JSON.stringify(override)}`]),
    );
  });

  test('It will include TESTPOD_ env vars', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    process.env.TESTPOD_API_KEY = 'my-secret';
    process.env.TESTPOD_VERBOSE = 'true';
    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
            env: [
              {
                name: 'TESTPOD_API_KEY',
                value: 'my-secret',
              },
              {
                name: 'TESTPOD_VERBOSE',
                value: 'true',
              },
            ],
          },
        ],
      },
    };
    await podRun({ name: '', namespace: 'test' }, 'myimage', null, false);
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        '--env=TESTPOD_API_KEY=my-secret',
        '--env=TESTPOD_VERBOSE=true',
        `--overrides=${JSON.stringify(override)}`,
      ]),
    );
    expect(exec.exec.mock.calls[0][1]).not.toEqual(
      expect.arrayContaining(['--env=GITHUB_REPOSITORY=extenda/actions']),
    );
  });

  test('It will trim TESTPOD_ prefixes from env vars', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    process.env.TESTPOD_API_KEY = 'my-secret';
    process.env.TESTPOD_VERBOSE = 'true';
    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
            env: [
              {
                name: 'API_KEY',
                value: 'my-secret',
              },
              {
                name: 'VERBOSE',
                value: 'true',
              },
            ],
          },
        ],
      },
    };
    await podRun({ name: '', namespace: 'test' }, 'myimage', null, true);
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        '--env=API_KEY=my-secret',
        '--env=VERBOSE=true',
        `--overrides=${JSON.stringify(override)}`,
      ]),
    );
    expect(exec.exec.mock.calls[0][1]).not.toEqual(
      expect.arrayContaining(['--env=GITHUB_REPOSITORY=extenda/actions']),
    );
  });

  test('It will save output', async () => {
    getImageDigest.mockResolvedValueOnce('myimage@sha256:111');
    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
        labels: {
          'opa-injection': 'false',
        },
        annotations: {
          'sidecar.istio.io/inject': 'false',
        },
      },
      spec: {
        containers: [
          {
            name: 'actions-15b1e98-test',
            image: 'myimage@sha256:111',
          },
        ],
      },
    };

    extract.extractOutput.mockReset();
    extract.extractOutput.mockResolvedValueOnce('test-pod-output');

    await podRun({ name: '', namespace: 'test' }, 'myimage', null, false);
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([`--overrides=${JSON.stringify(override)}`]),
    );
    expect(extract.extractOutput).toHaveBeenCalled();
  });
});
