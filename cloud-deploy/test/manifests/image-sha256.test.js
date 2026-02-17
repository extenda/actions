import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../setup-gcloud/src/index.js');
vi.mock('@actions/exec');

import { getExecOutput } from '@actions/exec';

import { execGcloud } from '../../../setup-gcloud/src/index.js';
import getImageWithSha256 from '../../src/manifests/image-sha256.js';

describe('Get image with SHA256', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const SHA_VALUE =
    'sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396';

  test('It resolves SHA256 tag from semver image using standard manifest', async () => {
    getExecOutput.mockResolvedValueOnce({ stdout: JSON.stringify({}) });
    execGcloud.mockResolvedValueOnce('').mockResolvedValueOnce(SHA_VALUE);

    const sha256Image = await getImageWithSha256(
      'eu.gcr.io/extenda/actions-test:v1.0.0',
    );

    expect(sha256Image).toEqual(`eu.gcr.io/extenda/actions-test@${SHA_VALUE}`);
    expect(getExecOutput).toHaveBeenCalledWith('docker', [
      'manifest',
      'inspect',
      'eu.gcr.io/extenda/actions-test:v1.0.0',
    ]);
    expect(execGcloud).toHaveBeenCalledWith([
      'auth',
      'configure-docker',
      '--quiet',
    ]);
    expect(execGcloud).toHaveBeenCalledWith([
      'container',
      'images',
      'describe',
      'eu.gcr.io/extenda/actions-test:v1.0.0',
      '--format=get(image_summary.digest)',
    ]);
  });

  test('It can handle image without semver tag using standard manifest', async () => {
    getExecOutput.mockResolvedValueOnce({ stdout: JSON.stringify({}) });
    execGcloud.mockResolvedValueOnce('').mockResolvedValueOnce(SHA_VALUE);

    const sha256Image = await getImageWithSha256(
      'eu.gcr.io/extenda/actions-test',
    );

    expect(sha256Image).toEqual(`eu.gcr.io/extenda/actions-test@${SHA_VALUE}`);
    expect(getExecOutput).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledTimes(2);
  });

  test('It resolves SHA256 from OCI Image Index (multi-arch)', async () => {
    const digest = 'sha256:amd64digest123456';
    getExecOutput.mockResolvedValueOnce({
      stdout: JSON.stringify({
        manifests: [
          {
            platform: { architecture: 'amd64', os: 'linux' },
            digest,
          },
          {
            platform: { architecture: 'arm64', os: 'linux' },
            digest: 'sha256:arm64digest123456',
          },
        ],
      }),
    });
    execGcloud.mockResolvedValueOnce('');

    const sha256Image = await getImageWithSha256(
      'eu.gcr.io/extenda/actions-test:v1.0.0',
    );

    expect(sha256Image).toEqual(`eu.gcr.io/extenda/actions-test@${digest}`);
    expect(getExecOutput).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledTimes(1);
  });

  test('It throws error when digest cannot be retrieved', async () => {
    getExecOutput.mockResolvedValueOnce({
      stdout: JSON.stringify({
        manifests: [
          {
            platform: { architecture: 'amd64', os: 'linux' },
          },
        ],
      }),
    });
    execGcloud.mockResolvedValueOnce('').mockResolvedValueOnce('');

    await expect(
      getImageWithSha256('eu.gcr.io/extenda/actions-test:v1.0.0'),
    ).rejects.toThrow(
      'Failed to retrieve digest for image eu.gcr.io/extenda/actions-test:v1.0.0',
    );
  });
});
