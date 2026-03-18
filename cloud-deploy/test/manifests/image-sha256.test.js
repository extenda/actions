import { afterEach, describe, expect, test, vi } from 'vitest';

import { authenticateDocker } from '../../../trivy-scan/src/index.js';
import { getImageDigest } from '../../../utils/src/index.js';

vi.mock('../../../trivy-scan/src/index.js');
vi.mock('../../../utils/src/index.js');

import getImageWithSha256 from '../../src/manifests/image-sha256.js';

const SHA_VALUE =
  'sha256:043112bde49f2244cf9e4c44d059603a7c056d13ad61ef3492f04374ac9a0396';

describe('Get image with SHA256', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('It resolves SHA256 tag from semver image', async () => {
    const semanticImage = 'eu.gcr.io/extenda/actions-test:v1.0.0';
    const shaImage = `eu.gcr.io/extenda/actions-test@${SHA_VALUE}`;

    authenticateDocker.mockResolvedValueOnce(0);
    getImageDigest.mockResolvedValueOnce(shaImage);

    const sha256Image = await getImageWithSha256(semanticImage);

    expect(sha256Image).toEqual(shaImage);

    expect(authenticateDocker).toHaveBeenCalledWith(semanticImage);

    expect(getImageDigest).toHaveBeenCalledWith(semanticImage);
  });
});
