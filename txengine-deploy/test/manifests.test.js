const mockFs = require('mock-fs');
const fs = require('fs');

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
const createVariables = require('../src/env-vars');

describe('manifests', () => {
  afterEach(() => {
    mockFs.restore();
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
    const vars = createVariables('project', 'image', 'tenant', 'SE');
    const result = await createManifests('secret-account', vars);
    expect(result.file).toEqual('.k8s/generated/00-manifest.yaml');
    expect(result.content).toEqual('---\nname: file0\n\n---\nname: file1\n\n---\nname: file2\n');
    expect(result.namespace).toEqual('txengine-tenant-se');
    expect(fs.existsSync(result.file)).toEqual(true);
    expect(fs.readFileSync(result.file, 'utf8')).toEqual(result.content);
  });

  test('It can replace variables in manifest', async () => {
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
    const vars = createVariables('project', 'image', 'tenant', 'SE');
    const { content } = await createManifests('secret-account', vars);
    expect(content).not.toContain('$NAMESPACE');
    expect(content).not.toContain('$CONTAINER_IMAGE');
    expect(content).toContain('namespace: txengine-tenant-se');
    expect(content).toContain('image: image');
  });
});
