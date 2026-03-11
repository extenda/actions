import * as core from '@actions/core';
import { exec } from '@actions/exec';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import { resolveImageDigests } from '../../utils/src/index.js';
import setupCosign from '../src/setup-cosign.js';
import uploadSbom from '../src/upload-sbom.js';

vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('../../setup-gcloud/src/index.js');
vi.mock('../src/resolve-digest.js');
vi.mock('../src/setup-cosign.js');
vi.mock('../../utils/src/index.js');

afterEach(() => {
  vi.resetAllMocks();
});

beforeEach(() => {
  execGcloud.mockResolvedValue(undefined);
  exec.mockResolvedValue(0);
  resolveImageDigests.mockResolvedValue({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:manifest',
    isMultiArch: false,
  });
  setupCosign.mockResolvedValue('/tmp/cosign');
});

test('It uploads SPDX and CycloneDX for single-arch image manifest digest without attestation', async () => {
  await uploadSbom(
    'eu.gcr.io/extenda/test:1.0.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    undefined,
  );

  expect(resolveImageDigests).toHaveBeenCalledTimes(1);
  expect(resolveImageDigests).toHaveBeenCalledWith(
    'eu.gcr.io/extenda/test:1.0.0',
  );

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
  expect(setupCosign).not.toHaveBeenCalled();
  expect(exec).not.toHaveBeenCalled();

  expect(core.startGroup).toHaveBeenCalledWith(
    'Uploading SBOMs for eu.gcr.io/extenda/test:1.0.0',
  );
  expect(core.endGroup).toHaveBeenCalledTimes(1);
});

test('It uploads and attests SPDX and CycloneDX for single-arch image manifest digest', async () => {
  await uploadSbom(
    'eu.gcr.io/extenda/test:1.1.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
  );

  expect(setupCosign).toHaveBeenCalledTimes(1);
  expect(exec).toHaveBeenCalledTimes(2);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'spdxjson',
    '--predicate',
    '.trivy/sbom.spdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'cyclonedx',
    '--predicate',
    '.trivy/sbom.cdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(core.info).toHaveBeenCalledWith(
    'Attesting SBOM for [eu.gcr.io/extenda/test@sha256:manifest] using [gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom]...',
  );
});

test('It uploads for both manifest and index when image is multi-arch without attestation', async () => {
  resolveImageDigests.mockResolvedValueOnce({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:manifest',
    isMultiArch: true,
  });

  await uploadSbom(
    'eu.gcr.io/extenda/test:2.0.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    undefined,
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
  expect(setupCosign).not.toHaveBeenCalled();
  expect(exec).not.toHaveBeenCalled();

  expect(core.info).toHaveBeenCalledWith(
    'Multi-arch detected: linking [.trivy/sbom.spdx.json] to Index SHA as well.',
  );
  expect(core.info).toHaveBeenCalledWith(
    'Multi-arch detected: linking [.trivy/sbom.cdx.json] to Index SHA as well.',
  );
});

test('It uploads and attests for both manifest and index when image is multi-arch', async () => {
  resolveImageDigests.mockResolvedValueOnce({
    indexSha: 'eu.gcr.io/extenda/test@sha256:index',
    manifestSha: 'eu.gcr.io/extenda/test@sha256:manifest',
    isMultiArch: true,
  });

  await uploadSbom(
    'eu.gcr.io/extenda/test:2.1.0',
    { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
  );

  expect(setupCosign).toHaveBeenCalledTimes(1);
  expect(exec).toHaveBeenCalledTimes(4);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'spdxjson',
    '--predicate',
    '.trivy/sbom.spdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'spdxjson',
    '--predicate',
    '.trivy/sbom.spdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:index',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'cyclonedx',
    '--predicate',
    '.trivy/sbom.cdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:manifest',
  ]);
  expect(exec).toHaveBeenCalledWith('/tmp/cosign', [
    'attest',
    '--key',
    'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    '--type',
    'cyclonedx',
    '--predicate',
    '.trivy/sbom.cdx.json',
    '--yes',
    'eu.gcr.io/extenda/test@sha256:index',
  ]);
});

test('It rethrows attestation errors', async () => {
  const err = new Error('attestation failed');
  exec.mockImplementation((_binary, args) =>
    args.includes('.trivy/sbom.spdx.json')
      ? Promise.reject(err)
      : Promise.resolve(0),
  );

  await expect(
    uploadSbom(
      'eu.gcr.io/extenda/test:2.2.0',
      { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
      'gcpkms://projects/test/locations/global/keyRings/ci/cryptoKeys/sbom',
    ),
  ).rejects.toThrow('attestation failed');

  expect(setupCosign).toHaveBeenCalledTimes(1);
});

test('It rethrows upload errors', async () => {
  const err = new Error('upload failed');
  execGcloud.mockRejectedValueOnce(err);

  await expect(
    uploadSbom(
      'eu.gcr.io/extenda/test:3.0.0',
      { spdx: '.trivy/sbom.spdx.json', cdx: '.trivy/sbom.cdx.json' },
      undefined,
    ),
  ).rejects.toThrow('upload failed');

  expect(core.error).toHaveBeenCalledWith(
    'Failed to upload SBOM [.trivy/sbom.spdx.json] to [eu.gcr.io/extenda/test@sha256:manifest]: upload failed',
  );
  expect(exec).not.toHaveBeenCalled();
});
