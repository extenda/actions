import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@actions/core');
vi.mock('axios');

import axios from 'axios';
import fs from 'fs';
import mockFs from 'mock-fs';
import yaml from 'yaml';

const mockLoadSecret = vi.fn();
vi.mock('../../gcp-secret-manager/src/secrets', () => ({
  loadSecret: mockLoadSecret,
}));

const mockContent = vi.fn();
vi.mock('@actions/github', () => ({
  getOctokit: () => ({
    rest: {
      repos: {
        getContent: mockContent,
      },
    },
  }),
}));

import createManifests from '../src/manifests.js';

describe('manifests', () => {
  afterEach(() => {
    mockFs.restore();
    vi.resetAllMocks();
  });

  beforeEach(() => {
    mockFs({});
    mockLoadSecret
      .mockResolvedValueOnce('ip')
      .mockResolvedValueOnce('password');
  });

  test('It can collect files into one', async () => {
    const mockYaml1 = '---\nname: file0\n';
    const mockYaml2 = '---\nname: file1\n';
    const mockYaml3 = '---\nname: file2\n';

    axios.mockResolvedValueOnce({ data: mockYaml1, status: 200 });
    axios.mockResolvedValueOnce({ data: mockYaml2, status: 200 });
    axios.mockResolvedValueOnce({ data: mockYaml3, status: 200 });
    mockContent.mockResolvedValueOnce({
      data: [
        {
          name: '02-file2.yaml',
          content: Buffer.from('---\nname: file2\n', 'utf8').toString('base64'),
        },
        {
          name: '00-file0.yaml',
          content: Buffer.from('---\nname: file0\n', 'utf8').toString('base64'),
        },
        {
          name: '01-file1.yaml',
          content: Buffer.from('---\nname: file1\n', 'utf8').toString('base64'),
        },
      ],
    });

    const vars = {
      replaceTokens: { NAMESPACE: 'txengine-tenant-se' },
      configMap: {},
      secrets: {},
    };
    const result = await createManifests('secret-account', vars);
    expect(axios).toHaveBeenCalledTimes(3);
    expect(result.file).toEqual('.k8s/generated/00-manifest.yaml');
    expect(result.content).toEqual(
      '---\nname: file0\n---\nname: file1\n---\nname: file2\n',
    );
    expect(result.namespace).toEqual('txengine-tenant-se');
    expect(fs.existsSync(result.file)).toEqual(true);
    expect(fs.readFileSync(result.file, 'utf8')).toEqual(result.content);
  });

  test('It can replace token variables in manifest', async () => {
    const mockYaml1 =
      '---\nname: file0\nnamespace: $NAMESPACE\nimage: $CONTAINER_IMAGE\n';
    const mockYaml2 = '---\nname: file1\nnamespace: $NAMESPACE';
    const mockYaml3 = '---\nname: file2\n';

    axios.mockResolvedValueOnce({ data: mockYaml1, status: 200 });
    axios.mockResolvedValueOnce({ data: mockYaml2, status: 200 });
    axios.mockResolvedValueOnce({ data: mockYaml3, status: 200 });
    mockContent.mockResolvedValueOnce({
      data: [
        {
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
            '---\nname: file1\nnamespace: $NAMESPACE',
            'utf8',
          ).toString('base64'),
        },
      ],
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
    const mockYaml = `---
    kind: ConfigMap
    metadata:
      name: test-txengine-env
    data:
      DATABASE_VENDOR: postgres
    `;
    axios.mockResolvedValueOnce({ data: mockYaml, status: 200 });
    mockContent.mockResolvedValueOnce({
      data: [
        {
          name: '00-file0.yaml',
          content: Buffer.from(mockYaml, 'utf8').toString('base64'),
        },
      ],
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
    const mockYaml = `---
    kind: Secret
    metadata:
      name: test-txengine-secrets
    stringData: {}
    `;
    axios.mockResolvedValueOnce({ data: mockYaml, status: 200 });
    mockContent.mockResolvedValueOnce({
      data: [
        {
          name: '00-file0.yaml',
          content: Buffer.from(mockYaml, 'utf8').toString('base64'),
        },
      ],
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
    const mockYaml = `---
    kind: ConfigMap
    metadata:
      name: test-txengine-env
    data:
      DATABASE_VENDOR: postgres
    `;
    axios.mockResolvedValueOnce({ data: mockYaml, status: 200 });
    mockContent.mockResolvedValueOnce({
      data: [
        {
          name: '00-file0.yaml',
          content: Buffer.from(mockYaml, 'utf8').toString('base64'),
        },
      ],
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
