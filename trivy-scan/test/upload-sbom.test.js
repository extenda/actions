import * as core from '@actions/core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { execGcloud, withGcloud } from '../../setup-gcloud/src/index.js';
import resolveDigest from '../src/resolve-digest.js';
import uploadSbom from '../src/upload-sbom.js';

vi.mock('@actions/core');
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../src/resolve-digest.js');

afterEach(() => {
  vi.resetAllMocks();
});

beforeEach(() => {
  withGcloud.mockImplementation(async (_serviceAccountKey, fn) => fn());
  execGcloud.mockResolvedValue(undefined);
  resolveDigest.mockResolvedValue({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:manifest',
    isMultiArch: false,
  });
});

test('It uploads SPDX and CycloneDX for single-arch image manifest digest', async () => {
  await uploadSbom(
    'eu.gcr.io/extenda/test:1.0.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    'service-account-json',
  );

  expect(withGcloud).toHaveBeenCalledTimes(1);
  expect(withGcloud).toHaveBeenCalledWith(
    'service-account-json',
    expect.any(Function),
  );
  expect(resolveDigest).toHaveBeenCalledTimes(1);
  expect(resolveDigest).toHaveBeenCalledWith('eu.gcr.io/extenda/test:1.0.0');

  expect(execGcloud).toHaveBeenCalledTimes(2);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.spdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.cdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:manifest',
  ]);

  expect(core.startGroup).toHaveBeenCalledWith(
    'Uploading SBOMs for eu.gcr.io/extenda/test:1.0.0',
  );
  expect(core.endGroup).toHaveBeenCalledTimes(1);
});

test('It uploads for both manifest and index when image is multi-arch', async () => {
  resolveDigest.mockResolvedValueOnce({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:manifest',
    isMultiArch: true,
  });

  await uploadSbom(
    'eu.gcr.io/extenda/test:2.0.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    'service-account-json',
  );

  expect(execGcloud).toHaveBeenCalledTimes(4);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.spdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.spdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:index',
  ]);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.cdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(execGcloud).toHaveBeenCalledWith([
    'artifacts',
    'sbom',
    'load',
    '--source=.trivy/sbom.cdx.json',
    '--uri=eu.gcr.io/extenda/test@sha256:index',
  ]);

  expect(core.info).toHaveBeenCalledWith(
    'Multi-arch detected: linking [.trivy/sbom.spdx.json] to Index SHA as well.',
  );
  expect(core.info).toHaveBeenCalledWith(
    'Multi-arch detected: linking [.trivy/sbom.cdx.json] to Index SHA as well.',
  );
});

test('It rethrows upload errors', async () => {
  const err = new Error('upload failed');
  execGcloud.mockRejectedValueOnce(err);

  await expect(
    uploadSbom(
      'eu.gcr.io/extenda/test:3.0.0',
      { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
      'service-account-json',
    ),
  ).rejects.toThrow('upload failed');

  expect(core.error).toHaveBeenCalledWith(
    'Failed to upload SBOM [.trivy/sbom.spdx.json] to [eu.gcr.io/extenda/test@sha256:manifest]: upload failed',
  );
});
