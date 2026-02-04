import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { execGcloud } from '../../../setup-gcloud/src/index.js';
import getImageWithSha256 from '../../src/manifests/image-sha256.js';

vi.mock('../../../setup-gcloud/src/index.js');

afterEach(() => {
  vi.resetAllMocks();
});

const SHA_VALUE =
  'sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396';

beforeEach(() => {
  execGcloud.mockResolvedValueOnce(SHA_VALUE);
});

test('It resolves SHA256 tag from semver image', async () => {
  const sha256Image = await getImageWithSha256(
    'eu.gcr.io/extenda/actions-test:v1.0.0',
  );
  expect(sha256Image).toEqual(`eu.gcr.io/extenda/actions-test@${SHA_VALUE}`);
  expect(execGcloud).toHaveBeenCalledWith([
    'container',
    'images',
    'describe',
    'eu.gcr.io/extenda/actions-test:v1.0.0',
    '--format=get(image_summary.digest)',
  ]);
});

test('It can handle image without semver tag', async () => {
  const sha256Image = await getImageWithSha256(
    'eu.gcr.io/extenda/actions-test',
  );
  expect(sha256Image).toEqual(`eu.gcr.io/extenda/actions-test@${SHA_VALUE}`);
  expect(execGcloud).toHaveBeenCalledWith([
    'container',
    'images',
    'describe',
    'eu.gcr.io/extenda/actions-test',
    '--format=get(image_summary.digest)',
  ]);
});
