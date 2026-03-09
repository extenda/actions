import { getExecOutput } from '@actions/exec';
import { afterEach, expect, test, vi } from 'vitest';

import {
  default as getImageDigest,
  resolveImageDigests,
} from '../src/image-digest.js';

vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('../../setup-gcloud/src/index.js');

afterEach(() => {
  vi.resetAllMocks();
});

test('It resolves digest for single-arch images', async () => {
  getExecOutput
    .mockResolvedValueOnce({
      stdout: JSON.stringify({ schemaVersion: 2 }),
    })
    .mockResolvedValueOnce({ stdout: '"sha256:index123"' });

  const result = await resolveImageDigests('eu.gcr.io/extenda/test:1.0.0');

  expect(getExecOutput).toHaveBeenNthCalledWith(1, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test:1.0.0',
    '--raw',
  ]);
  expect(getExecOutput).toHaveBeenNthCalledWith(2, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test:1.0.0',
    '--format',
    '{{json .Manifest.Digest}}',
  ]);

  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index123',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index123',
    isMultiArch: false,
  });
});

test('It resolves linux/amd64 digest for multi-arch images', async () => {
  getExecOutput
    .mockResolvedValueOnce({
      stdout: JSON.stringify({
        manifests: [
          {
            digest: 'sha256:arm64digest',
            platform: { architecture: 'arm64', os: 'linux' },
          },
          {
            digest: 'sha256:amd64digest',
            platform: { architecture: 'amd64', os: 'linux' },
          },
        ],
      }),
    })
    .mockResolvedValueOnce({ stdout: '"sha256:index456"' });

  const result = await resolveImageDigests('eu.gcr.io/extenda/test:2.0.0');

  expect(getExecOutput).toHaveBeenCalledTimes(2);
  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index456',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:amd64digest',
    isMultiArch: true,
  });
});

test('It falls back to index digest when linux/amd64 is not found', async () => {
  getExecOutput
    .mockResolvedValueOnce({
      stdout: JSON.stringify({
        manifests: [
          {
            digest: 'sha256:arm64digest',
            platform: { architecture: 'arm64', os: 'linux' },
          },
        ],
      }),
    })
    .mockResolvedValueOnce({ stdout: '"sha256:index789"' });

  const result = await resolveImageDigests(
    'eu.gcr.io/extenda/test@sha256:already-pinned',
  );

  expect(getExecOutput).toHaveBeenNthCalledWith(1, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test@sha256:already-pinned',
    '--raw',
  ]);
  expect(getExecOutput).toHaveBeenNthCalledWith(2, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test@sha256:already-pinned',
    '--format',
    '{{json .Manifest.Digest}}',
  ]);
  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index789',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index789',
    isMultiArch: true,
  });
});

test('It returns manifest digest with getImageWithSha256', async () => {
  getExecOutput
    .mockResolvedValueOnce({
      stdout: JSON.stringify({
        manifests: [
          {
            digest: 'sha256:arm64digest',
            platform: { architecture: 'arm64', os: 'linux' },
          },
          {
            digest: 'sha256:amd64digest',
            platform: { architecture: 'amd64', os: 'linux' },
          },
        ],
      }),
    })
    .mockResolvedValueOnce({ stdout: '"sha256:index999"' });

  const result = await getImageDigest('eu.gcr.io/extenda/test:3.0.0');

  expect(getExecOutput).toHaveBeenNthCalledWith(1, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test:3.0.0',
    '--raw',
  ]);
  expect(getExecOutput).toHaveBeenNthCalledWith(2, 'docker', [
    'buildx',
    'imagetools',
    'inspect',
    'eu.gcr.io/extenda/test:3.0.0',
    '--format',
    '{{json .Manifest.Digest}}',
  ]);
  expect(result).toEqual('eu.gcr.io/extenda/test@sha256:amd64digest');
});
