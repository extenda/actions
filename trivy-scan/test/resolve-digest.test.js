import { afterEach, expect, test, vi } from 'vitest';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import { resolveImageDigests } from '../../utils/src/index.js';
import resolveDigest from '../src/resolve-digest.js';

vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../../utils/src/index.js');

afterEach(() => {
  vi.resetAllMocks();
});

test('It authenticates Docker before it resolves digests', async () => {
  execGcloud.mockResolvedValueOnce(undefined);
  resolveImageDigests.mockResolvedValueOnce({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index123',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index123',
    isMultiArch: false,
  });

  const result = await resolveDigest('eu.gcr.io/extenda/test:1.0.0');

  expect(execGcloud).toHaveBeenCalledWith([
    'auth',
    'configure-docker',
    '--quiet',
  ]);

  expect(result).toEqual({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index123',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:index123',
    isMultiArch: false,
  });
});
