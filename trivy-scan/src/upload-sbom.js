import * as core from '@actions/core';
import { exec } from '@actions/exec';

import { execGcloud } from '../../setup-gcloud/src/index.js';
import { resolveImageDigests } from '../../utils/src/index.js';
import setupCosign from './setup-cosign.js';

const attestSbom = async (cosign, attestationKeyUri, uri, sbom) => {
  core.info(`Attesting SBOM for [${uri}] using [${attestationKeyUri}]...`);
  return exec(cosign, [
    'attest',
    '--key',
    attestationKeyUri,
    '--type',
    sbom.includes('spdx') ? 'spdxjson' : 'cyclonedx',
    '--predicate',
    sbom,
    '--yes',
    uri,
  ]);
};

const upload = async (uri, sbom) => {
  core.info(`Uploading SBOM [${sbom}] to URI [${uri}]...`);
  return execGcloud([
    'artifacts',
    'sbom',
    'load',
    `--source=${sbom}`,
    `--uri=${uri}`,
  ])
    .then(() => {
      core.info(`Uploaded SBOM [${sbom}] to URI [${uri}]`);
    })
    .catch((error) => {
      core.error(
        `Failed to upload SBOM [${sbom}] to [${uri}]: ${error.message}`,
      );
      // Rethrow the error to ensure the action fails if the upload fails. This ensures CRA compliance.
      throw error;
    });
};

const uploadForDigest = (digests, sbom, cosignFn) => {
  const uploads = [];

  // Always upload the specific platform manifest (the artifact)
  uploads.push(
    upload(digests.manifestSha, sbom).then(() =>
      cosignFn(digests.manifestSha, sbom),
    ),
  );

  if (digests.isMultiArch) {
    // For multi-arch images, also link the SBOM to the index list (the product).
    core.info(`Multi-arch detected: linking [${sbom}] to Index SHA as well.`);
    uploads.push(
      upload(digests.indexSha, sbom).then(() =>
        cosignFn(digests.indexSha, sbom),
      ),
    );
  }
  return uploads;
};

/**
 * Upload SBOM artifacts to Google Artifact Registry.
 * @param image the image that was scanned
 * @param spdx the SPDX SBOM file path
 * @param cdx the CycloneDX SBOM file path
 * @param attestationKeyUri the KMS key URI to use for signing the SBOM attestations. If not provided, SBOMs will be uploaded without attestation.
 * @return {Promise<void>} a promise that resolves when the uploads are complete
 */
export default async function uploadSbom(
  image,
  { spdx, cdx },
  attestationKeyUri,
) {
  let cosignFn;
  if (attestationKeyUri) {
    const cosign = await setupCosign();
    cosignFn = async (uri, sbom) =>
      attestSbom(cosign, attestationKeyUri, uri, sbom);
  } else {
    cosignFn = async () => {};
  }

  core.startGroup(`Uploading SBOMs for ${image}`);
  const digests = await resolveImageDigests(image);
  await Promise.all([
    // Upload SPDX for legal compliance use cases
    ...uploadForDigest(digests, spdx, cosignFn),
    // Upload CycloneDX for vulnerability management use cases
    ...uploadForDigest(digests, cdx, cosignFn),
  ]);
  core.endGroup();
}
