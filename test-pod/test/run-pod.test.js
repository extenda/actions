jest.mock('@actions/exec');

const exec = require('@actions/exec');
const podRun = require('../src/run-pod');

const orgEnv = process.env;

describe('Pod run', () => {
  beforeEach(() => {
    process.env = {
      ...orgEnv,
      GITHUB_REPOSITORY: 'extenda/actions',
      GITHUB_SHA: '15b1e9856fc56aaf79ddece96c0d931bf67227f0',
    };
    exec.exec.mockResolvedValue(0);
  });
  afterEach(() => {
    process.env = orgEnv;
    jest.resetAllMocks();
  });

  test('It will run test without config map', async () => {
    await podRun({ name: '', namespace: 'test' }, 'myimage', null);
    expect(exec.exec).toHaveBeenCalledWith('kubectl', [
      'run',
      'actions-15b1e98-test',
      '--rm',
      '--attach',
      '--restart=Never',
      '--image=myimage',
      '-n',
      'test',
    ]);
  });

  test('It will run test with complete config map', async () => {
    await podRun({ name: 'test', namespace: 'test' }, 'myimage', {
      name: 'testmap',
      workingDirectory: true,
      entrypoint: true,
    });

    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
      },
      spec: {
        containers: [{
          name: 'actions-15b1e98-test',
          image: 'myimage',
          workingDir: '/work',
          volumeMounts: [{
            mountPath: '/work',
            name: 'workspace',
            readOnly: false,
          }],
          env: [{
            name: 'SERVICE_URL',
            value: 'http://test.test',
          }],
          command: ['/bin/sh', 'entrypoint.sh'],
        }],
        volumes: [{
          name: 'workspace',
          configMap: {
            name: 'testmap',
          },
        }],
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
    await podRun({ name: '', namespace: 'test' }, 'myimage', {
      name: 'testmap',
      workingDirectory: true,
      entrypoint: false,
    });

    const override = {
      apiVersion: 'v1',
      metadata: {
        namespace: 'test',
      },
      spec: {
        containers: [{
          name: 'actions-15b1e98-test',
          image: 'myimage',
          workingDir: '/work',
          volumeMounts: [{
            mountPath: '/work',
            name: 'workspace',
            readOnly: false,
          }],
        }],
        volumes: [{
          name: 'workspace',
          configMap: {
            name: 'testmap',
          },
        }],
      },
    };
    expect(exec.exec.mock.calls[0][1]).toEqual(
      expect.arrayContaining([`--overrides=${JSON.stringify(override)}`]),
    );
  });
});
