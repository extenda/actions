import * as core from '@actions/core';
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

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test:1.0.0',
      '--raw',
    ],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test:1.0.0',
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    { silent: true },
  );

  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index123',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index123',
    isMultiArch: false,
  });
  expect(core.info).toHaveBeenCalledWith(
    'Detected single-arch image for eu.gcr.io/extenda/test:1.0.0',
  );
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
  expect(core.info).toHaveBeenNthCalledWith(
    1,
    'Detected Multi-Arch image for eu.gcr.io/extenda/test:2.0.0',
  );
  expect(core.info).toHaveBeenNthCalledWith(
    2,
    'Resolved linux/amd64 platform digest: sha256:amd64digest',
  );
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

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test@sha256:already-pinned',
      '--raw',
    ],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test@sha256:already-pinned',
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    { silent: true },
  );
  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index789',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index789',
    isMultiArch: true,
  });
  expect(core.info).toHaveBeenCalledWith(
    'Detected Multi-Arch image for eu.gcr.io/extenda/test@sha256:already-pinned',
  );
  expect(core.warning).toHaveBeenCalledWith(
    'Multi-arch image found but no linux/amd64 platform detected. Falling back to Index SHA.',
  );
});

test('It falls back to the local Docker image id when registry lookup fails', async () => {
  getExecOutput
    .mockRejectedValueOnce(new Error('manifest not found'))
    .mockResolvedValueOnce({ stdout: 'sha256:local123\n' });

  const result = await resolveImageDigests('local/test-image:dev');

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    ['buildx', 'imagetools', 'inspect', 'local/test-image:dev', '--raw'],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    ['inspect', '--format', '{{.Id}}', 'local/test-image:dev'],
    { silent: true },
  );
  expect(result).toEqual({
    indexSha: 'sha256:local123',
    manifestSha: 'sha256:local123',
    isMultiArch: false,
  });
  expect(core.info).toHaveBeenNthCalledWith(
    1,
    'Image [local/test-image:dev] not found in registry. Checking local Docker daemon...',
  );
  expect(core.info).toHaveBeenNthCalledWith(
    2,
    'Detected local-only image. Using Image ID: sha256:local123',
  );
});

test('It falls back to the local Docker image id when index digest lookup fails', async () => {
  getExecOutput
    .mockResolvedValueOnce({ stdout: JSON.stringify({ schemaVersion: 2 }) })
    .mockRejectedValueOnce(new Error('format inspect failed'))
    .mockResolvedValueOnce({ stdout: 'sha256:local456\n' });

  const result = await resolveImageDigests('local/test-image:staging');

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    ['buildx', 'imagetools', 'inspect', 'local/test-image:staging', '--raw'],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'local/test-image:staging',
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    3,
    'docker',
    ['inspect', '--format', '{{.Id}}', 'local/test-image:staging'],
    { silent: true },
  );
  expect(result).toEqual({
    indexSha: 'sha256:local456',
    manifestSha: 'sha256:local456',
    isMultiArch: false,
  });
  expect(core.info).toHaveBeenNthCalledWith(
    1,
    'Image [local/test-image:staging] not found in registry. Checking local Docker daemon...',
  );
  expect(core.info).toHaveBeenNthCalledWith(
    2,
    'Detected local-only image. Using Image ID: sha256:local456',
  );
});

test('It throws when the image is unavailable in both registry and local Docker', async () => {
  getExecOutput
    .mockRejectedValueOnce(new Error('manifest not found'))
    .mockResolvedValueOnce({ stdout: '' });

  await expect(resolveImageDigests('missing-image:latest')).rejects.toThrow(
    'Image missing-image:latest not found locally.',
  );

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    ['buildx', 'imagetools', 'inspect', 'missing-image:latest', '--raw'],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    ['inspect', '--format', '{{.Id}}', 'missing-image:latest'],
    { silent: true },
  );
  expect(core.info).toHaveBeenCalledWith(
    'Image [missing-image:latest] not found in registry. Checking local Docker daemon...',
  );
});

test('It propagates local Docker inspect errors after registry lookup fails', async () => {
  getExecOutput
    .mockRejectedValueOnce(new Error('manifest not found'))
    .mockRejectedValueOnce(new Error('cannot connect to docker daemon'));

  await expect(
    resolveImageDigests('broken-local-image:latest'),
  ).rejects.toThrow('cannot connect to docker daemon');

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    ['buildx', 'imagetools', 'inspect', 'broken-local-image:latest', '--raw'],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    ['inspect', '--format', '{{.Id}}', 'broken-local-image:latest'],
    { silent: true },
  );
  expect(core.info).toHaveBeenCalledWith(
    'Image [broken-local-image:latest] not found in registry. Checking local Docker daemon...',
  );
});

test('It returns manifest digest with getImageDigest', async () => {
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

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test:3.0.0',
      '--raw',
    ],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      'eu.gcr.io/extenda/test:3.0.0',
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    { silent: true },
  );
  expect(result).toEqual('eu.gcr.io/extenda/test@sha256:amd64digest');
});

test('It returns the local manifest digest with getImageDigest when registry lookup fails', async () => {
  getExecOutput
    .mockRejectedValueOnce(new Error('manifest not found'))
    .mockResolvedValueOnce({ stdout: 'sha256:local999\n' });

  const result = await getImageDigest('local/test-image:prod');

  expect(getExecOutput).toHaveBeenNthCalledWith(
    1,
    'docker',
    ['buildx', 'imagetools', 'inspect', 'local/test-image:prod', '--raw'],
    { silent: true },
  );
  expect(getExecOutput).toHaveBeenNthCalledWith(
    2,
    'docker',
    ['inspect', '--format', '{{.Id}}', 'local/test-image:prod'],
    { silent: true },
  );
  expect(result).toEqual('sha256:local999');
});
