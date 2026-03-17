import { afterEach, describe, expect, test, vi } from 'vitest';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import authenticateDocker from '../src/docker-auth.js';

vi.mock('../../setup-gcloud/src/index.js');

afterEach(() => {
  vi.resetAllMocks();
});

describe('It does not authenticate for non-Google registries', async () => {
  for (const image of ['docker.io/library/ubuntu:latest', 'ubuntu']) {
    test(`It does not authenticate for ${image}`, async () => {
      const result = await authenticateDocker(image);
      expect(result).toBeNull();
      expect(execGcloud).not.toHaveBeenCalled();
    });
  }
});

test('It authenticates for gcr.io registries', async () => {
  execGcloud.mockResolvedValueOnce(undefined);

  await authenticateDocker('eu.gcr.io/my-project/my-image:1.0.0');

  expect(execGcloud).toHaveBeenCalledWith([
    'auth',
    'configure-docker',
    'eu.gcr.io',
    '--quiet',
  ]);
});

test('It authenticates for Artifact Registry docker registries', async () => {
  execGcloud.mockResolvedValueOnce(undefined);

  await authenticateDocker(
    'europe-west1-docker.pkg.dev/my-project/my-repo/my-image:1.0.0',
  );

  expect(execGcloud).toHaveBeenCalledWith([
    'auth',
    'configure-docker',
    'europe-west1-docker.pkg.dev',
    '--quiet',
  ]);
});
