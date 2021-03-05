const mockFs = require('mock-fs');
const fs = require('fs');
const yaml = require('yaml');

const mockLoadSecret = jest.fn();
jest.mock('../../gcp-secret-manager/src/secrets', () => ({
  loadSecret: mockLoadSecret,
}));

const mockContent = jest.fn();
jest.mock('@actions/github', () => ({
  getOctokit: () => ({
    repos: {
      getContent: mockContent,
    },
  }),
}));

const createManifests = require('../src/manifests');

describe('manifests', () => {
  afterEach(() => {
    mockFs.restore();
    jest.resetAllMocks();
  });

  beforeEach(() => {
    mockFs({});
    mockLoadSecret.mockResolvedValueOnce('ip').mockResolvedValueOnce('password');
  });

  test('It can collect files into one', async () => {
    mockContent.mockResolvedValueOnce({
      data: [{
        name: '02-file2.yaml',
        content: Buffer.from('---\nname: file2\n', 'utf8').toString('base64'),
      },
      {
        name: '00-file0.yaml',
        content: Buffer.from(
          '---\nname: file0\n',
          'utf8',
        ).toString('base64'),
      },
      {
        name: '01-file1.yaml',
        content: Buffer.from(
          '---\nname: file1\n', 'utf8',
        ).toString('base64'),
      }],
    });
    const vars = {
      replaceTokens: { NAMESPACE: 'txengine-tenant-se' },
      configMap: {},
      secrets: {},
    };
    const result = await createManifests('secret-account', vars);
    expect(result.file).toEqual('.k8s/generated/00-manifest.yaml');
    expect(result.content).toEqual('---\nname: file0\n---\nname: file1\n---\nname: file2\n');
    expect(result.namespace).toEqual('txengine-tenant-se');
    expect(fs.existsSync(result.file)).toEqual(true);
    expect(fs.readFileSync(result.file, 'utf8')).toEqual(result.content);
  });

  test('It can replace token variables in manifest', async () => {
    mockContent.mockResolvedValueOnce({
      data: [{
        name: '02-file2.yaml',
        content: Buffer.from('---\nname: file2\n', 'utf8').toString('base64'),
      },
      {
        name: '00-file0.yaml',
        content: Buffer.from(
          '---\nname: file0\nnamespace: $NAMESPACE\nimage: $CONTAINER_IMAGE\n',
          'utf8',
        ).toString('base64'),
      },
      {
        name: '01-file1.yaml',
        content: Buffer.from(
          '---\nname: file1\nnamespace: $NAMESPACE', 'utf8',
        ).toString('base64'),
      }],
    });
    const vars = {
      replaceTokens: {
        NAMESPACE: 'txengine-tenant-se',
        CONTAINER_IMAGE: 'image',
      },
      configMap: {},
      secrets: {},
    };
    const { content } = await createManifests('secret-account', vars);
    expect(content).not.toContain('$NAMESPACE');
    expect(content).not.toContain('$CONTAINER_IMAGE');
    expect(content).toContain('namespace: txengine-tenant-se');
    expect(content).toContain('image: image');
  });

  test('It can populate a config map', async () => {
    mockContent.mockResolvedValueOnce({
      data: [{
        name: '00-file0.yaml',
        content: Buffer.from(
          `---
kind: ConfigMap
metadata:
  name: test-txengine-env
data:
  DATABASE_VENDOR: postgres
`,
          'utf8',
        ).toString('base64'),
      }],
    });
    const vars = {
      replaceTokens: {},
      configMap: {
        EXTRA_VARIABLE: 'extra-value',
        VARIABLE2: 'value2',
      },
      secrets: {},
    };
    const { content } = await createManifests('secret-account', vars);

    expect(yaml.parse(content)).toMatchObject({
      kind: 'ConfigMap',
      data: {
        DATABASE_VENDOR: 'postgres',
        EXTRA_VARIABLE: 'extra-value',
        VARIABLE2: 'value2',
      },
    });
  });

  test('It can populate secrets', async () => {
    mockContent.mockResolvedValueOnce({
      data: [{
        name: '00-file0.yaml',
        content: Buffer.from(
          `---
kind: Secret
metadata:
  name: test-txengine-secrets
stringData: {}
`,
          'utf8',
        ).toString('base64'),
      }],
    });
    const vars = {
      replaceTokens: {},
      configMap: {},
      secrets: {
        SECRET: 'my-value',
      },
    };
    const { content } = await createManifests('secret-account', vars);

    expect(yaml.parse(content)).toMatchObject({
      kind: 'Secret',
      stringData: {
        SECRET: 'my-value',
      },
    });
  });

  test('It is possible to override default values', async () => {
    mockContent.mockResolvedValueOnce({
      data: [{
        name: '00-file0.yaml',
        content: Buffer.from(
          `---
kind: ConfigMap
metadata:
  name: test-txengine-env
data:
  DATABASE_VENDOR: postgres
`,
          'utf8',
        ).toString('base64'),
      }],
    });
    const vars = {
      replaceTokens: {},
      configMap: {
        DATABASE_VENDOR: 'hsqldb',
      },
      secrets: {},
    };
    const { content } = await createManifests('secret-account', vars);

    expect(yaml.parse(content)).toMatchObject({
      kind: 'ConfigMap',
      data: {
        DATABASE_VENDOR: 'hsqldb',
      },
    });
  });
});
