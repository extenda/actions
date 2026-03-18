import { getExecOutput } from '@actions/exec';
import { afterEach, describe, expect, test, vi } from 'vitest';

import getImageWithSha256 from '../../cloud-deploy/src/manifests/image-sha256.js';
import { execGcloud } from '../../setup-gcloud/src/index.js';
import {
  createAttestation,
  getArtifactUrl,
} from '../src/create-sign-attestion.js';

vi.mock('../../setup-gcloud/src/index.js');
vi.mock('@actions/exec');
vi.mock('../../cloud-deploy/src/manifests/image-sha256.js');

describe('Create attestation', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  test('Create attestation', async () => {
    createAttestation(
      'eu.gcr.io/my-iamge@digest2626',
      'quality-assurance-attestor',
      'attestor-project',
      'key-project',
      'europe-west1',
      'global-keyring',
      'key',
      '1',
    );
    getExecOutput.mockResolvedValueOnce(JSON.stringify({}));
    // execGcloud.mockResolvedValueOnce('digest2626');

    getImageWithSha256.mockResolvedValueOnce('eu.gcr.io/my-iamge@digest2626');

    expect(execGcloud).toHaveBeenCalledTimes(1);
    expect(execGcloud).toHaveBeenCalledWith([
      '--quiet',
      'beta',
      'container',
      'binauthz',
      'attestations',
      'sign-and-create',
      '--artifact-url=eu.gcr.io/my-iamge@digest2626',
      '--attestor=quality-assurance-attestor',
      '--attestor-project=attestor-project',
      '--keyversion-project=key-project',
      '--keyversion-location=europe-west1',
      '--keyversion-keyring=global-keyring',
      '--keyversion-key=key',
      '--keyversion=1',
    ]);
  });

  test('Get artifact URL with default tag', async () => {
    getImageWithSha256.mockResolvedValueOnce('eu.gcr.io/my-image@djdq1787');

    expect(await getArtifactUrl('tag', 'eu.gcr.io/my-image')).toEqual(
      'eu.gcr.io/my-image@djdq1787',
    );
    expect(getImageWithSha256).toHaveBeenCalledWith('eu.gcr.io/my-image:tag');
  });

  test('Get artifact URL provided a tag in the imagePath', async () => {
    getImageWithSha256.mockResolvedValueOnce('eu.gcr.io/my-image@dut6h1787');
    expect(await getArtifactUrl('tag1', 'eu.gcr.io/my-image:tag1')).toEqual(
      'eu.gcr.io/my-image@dut6h1787',
    );
  });
});
