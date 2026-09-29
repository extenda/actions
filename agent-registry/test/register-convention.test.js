import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@actions/core');
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));
vi.mock('node:os', () => ({
  default: { tmpdir: vi.fn(() => '/tmp') },
  tmpdir: vi.fn(() => '/tmp'),
}));
vi.mock('fast-glob');
vi.mock('../../setup-gcloud/src/exec-gcloud.js');

import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';

import * as core from '@actions/core';
import fg from 'fast-glob';

import { execGcloud } from '../../setup-gcloud/src/exec-gcloud.js';
import {
  readConvention,
  registerConvention,
  uploadConventionIndex,
} from '../src/register-convention.js';

const CONVENTIONS_MD = `---
name: Java conventions
description: House rules for Java services
---

## Rules
`;

const call = (n) => execGcloud.mock.calls[n][0];

beforeEach(() => {
  readFileSync.mockReturnValue(CONVENTIONS_MD);
  fg.sync.mockReturnValue(['CONVENTIONS.md']);
  execGcloud.mockResolvedValue('');
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('readConvention', () => {
  test('returns name, description and every file in the directory', () => {
    fg.sync.mockReturnValue(['CONVENTIONS.md', 'references/logging.md']);

    expect(readConvention('java', '/conv')).toEqual({
      name: 'Java conventions',
      description: 'House rules for Java services',
      files: ['CONVENTIONS.md', 'references/logging.md'],
    });
    expect(fg.sync).toHaveBeenCalledWith('**/*', {
      cwd: '/conv',
      onlyFiles: true,
      dot: true,
    });
    expect(readFileSync).toHaveBeenCalledWith('/conv/CONVENTIONS.md', 'utf8');
  });

  test('throws when CONVENTIONS.md is missing', () => {
    fg.sync.mockReturnValue(['references/logging.md']);
    expect(() => readConvention('java', '/conv')).toThrow(
      "Convention directory 'java' is missing required file: CONVENTIONS.md",
    );
  });

  test('throws when frontmatter name is missing', () => {
    readFileSync.mockReturnValue('---\ndescription: D\n---\nbody\n');
    expect(() => readConvention('java', '/conv')).toThrow(
      'missing required frontmatter field: name',
    );
  });

  test('throws when frontmatter description is missing', () => {
    readFileSync.mockReturnValue('---\nname: N\n---\nbody\n');
    expect(() => readConvention('java', '/conv')).toThrow(
      'missing required frontmatter field: description',
    );
  });

  test('throws when body is empty', () => {
    readFileSync.mockReturnValue('---\nname: N\ndescription: D\n---\n');
    expect(() => readConvention('java', '/conv')).toThrow(
      'must have content after the frontmatter',
    );
  });
});

describe('registerConvention', () => {
  test('uploads the directory to the git-SHA path and the latest path', async () => {
    await registerConvention('java', '/conv', 'abc123', false, 'cardpayment');

    expect(call(0)).toEqual([
      'storage',
      'rsync',
      '/conv',
      'gs://extenda-agent-artifacts/conventions/cardpayment/java/abc123/',
      '--recursive',
    ]);
    expect(call(1)).toEqual([
      'storage',
      'rsync',
      '/conv',
      'gs://extenda-agent-artifacts/conventions/cardpayment/java/',
      '--recursive',
    ]);
  });

  test('logs the full file list', async () => {
    fg.sync.mockReturnValue(['CONVENTIONS.md', 'references/logging.md']);

    await registerConvention('java', '/conv', 'abc123', false, 'cardpayment');

    expect(core.info).toHaveBeenCalledWith(
      '[convention] files (2): CONVENTIONS.md, references/logging.md',
    );
  });

  test('dry-run validates and logs without uploading', async () => {
    await registerConvention('java', '/conv', 'abc123', true, 'cardpayment');

    expect(core.info).toHaveBeenCalledWith(
      '[dry-run] Would upload convention to gs://extenda-agent-artifacts/conventions/cardpayment/java/',
    );
    expect(execGcloud).not.toHaveBeenCalled();
  });

  test('fails before uploading when CONVENTIONS.md is missing', async () => {
    fg.sync.mockReturnValue([]);

    await expect(
      registerConvention('java', '/conv', 'abc123', false, 'cardpayment'),
    ).rejects.toThrow('missing required file: CONVENTIONS.md');
    expect(execGcloud).not.toHaveBeenCalled();
  });
});

describe('uploadConventionIndex', () => {
  const conventions = [
    { id: 'java', name: 'Java conventions', description: 'House rules' },
    { id: 'api', name: 'API conventions', description: 'REST rules' },
  ];

  test('writes the index with a path per convention and uploads it', async () => {
    await uploadConventionIndex('cardpayment', conventions, false);

    const [tmpPath, json] = writeFileSync.mock.calls[0];
    expect(JSON.parse(json)).toEqual({
      clan: 'cardpayment',
      conventions: [
        {
          id: 'java',
          name: 'Java conventions',
          description: 'House rules',
          path: 'conventions/cardpayment/java/CONVENTIONS.md',
        },
        {
          id: 'api',
          name: 'API conventions',
          description: 'REST rules',
          path: 'conventions/cardpayment/api/CONVENTIONS.md',
        },
      ],
    });
    expect(call(0)).toEqual([
      'storage',
      'cp',
      tmpPath,
      'gs://extenda-agent-artifacts/conventions/cardpayment/index.json',
    ]);
    expect(unlinkSync).toHaveBeenCalledWith(tmpPath);
  });

  test('uploads an empty index when the clan has no conventions left', async () => {
    await uploadConventionIndex('cardpayment', [], false);

    expect(JSON.parse(writeFileSync.mock.calls[0][1])).toEqual({
      clan: 'cardpayment',
      conventions: [],
    });
    expect(execGcloud).toHaveBeenCalledOnce();
  });

  test('deletes the temp file even when the upload fails', async () => {
    execGcloud.mockRejectedValueOnce(new Error('gcloud error'));

    await expect(
      uploadConventionIndex('cardpayment', conventions, false),
    ).rejects.toThrow('gcloud error');
    expect(unlinkSync).toHaveBeenCalledOnce();
  });

  test('dry-run logs without writing or uploading', async () => {
    await uploadConventionIndex('cardpayment', conventions, true);

    expect(core.info).toHaveBeenCalledWith('[convention] index: java, api');
    expect(core.info).toHaveBeenCalledWith(
      '[dry-run] Would upload convention index to gs://extenda-agent-artifacts/conventions/cardpayment/index.json',
    );
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(execGcloud).not.toHaveBeenCalled();
  });
});
